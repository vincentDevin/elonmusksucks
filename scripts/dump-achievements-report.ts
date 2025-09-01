/* scripts/dump-achievements-report.ts */
import fs from 'node:fs';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';

// Try to import from your shared types; fall back to a local list if not resolvable.
let AllowedEventKeys: string[] = [];
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const types = require('@ems/types');
  AllowedEventKeys = Array.from(new Set([
    ...(types?.AchievementEventKeyValues ?? []),  // if you export values array
    ...(types?.AchievementEventKeys ?? []),
    ...(types?.AllowedEventKeys ?? []),
    // Add any known keys that aren't exported yet:
    'pong:match:completed',
    'pong:match:lost',
    'pong:elo:milestone',
  ].flat().filter(Boolean)));
} catch {
  AllowedEventKeys = [
    'pong:match:completed',
    'pong:match:lost',
    'pong:elo:milestone',
    'prediction:bet:settled',
    'prediction:market:settled',
    'bet:placed'
  ];
}

type Condition =
  | { eq:  { path: string; value: unknown } }
  | { gte: { path: string; value: number } }
  | { lte: { path: string; value: number } }
  | { and: { all: Condition[] } }
  | { or:  { any: Condition[] } };

type ProgressSpec =
  | { kind: 'count';  when: Condition }
  | { kind: 'binary'; when: Condition }
  | { kind: 'streak'; when: Condition; resetWhen: Condition };

interface RuleData {
  eventKeys: string[];
  progress: ProgressSpec;
  unlock: { gte: { path: 'progress'; value: number } };
}

const prisma = new PrismaClient();

function getByPath(obj: any, pathStr: string): any {
  if (!pathStr) return undefined;
  const parts = pathStr.split('.');
  let cur = obj;
  for (const p of parts) {
    if (cur == null) return undefined;
    cur = cur[p];
  }
  return cur;
}

function normalizeValue(value: any, event: any) {
  // Replace "$.userId" placeholder with event.userId for comparisons.
  if (typeof value === 'string' && value.startsWith('$.')) {
    const v = getByPath(event, value.slice(2));
    return v;
  }
  return value;
}

function validateCondition(cond: Condition, errors: string[], prefix = 'progress.when'): boolean {
  if ('eq' in cond) {
    const { path, value } = cond.eq;
    if (!path) errors.push(`${prefix}.eq.path missing`);
    if (value === undefined) errors.push(`${prefix}.eq.value missing`);
    return errors.length === 0;
  }
  if ('gte' in cond) {
    const { path, value } = cond.gte;
    if (!path) errors.push(`${prefix}.gte.path missing`);
    if (typeof value !== 'number') errors.push(`${prefix}.gte.value must be number`);
    return errors.length === 0;
  }
  if ('lte' in cond) {
    const { path, value } = cond.lte;
    if (!path) errors.push(`${prefix}.lte.path missing`);
    if (typeof value !== 'number') errors.push(`${prefix}.lte.value must be number`);
    return errors.length === 0;
  }
  if ('and' in cond) {
    if (!Array.isArray(cond.and.all) || cond.and.all.length === 0) {
      errors.push(`${prefix}.and.all must be non-empty array`);
      return false;
    }
    return cond.and.all.every((c, i) => validateCondition(c as any, errors, `${prefix}.and.all[${i}]`));
  }
  if ('or' in cond) {
    if (!Array.isArray(cond.or.any) || cond.or.any.length === 0) {
      errors.push(`${prefix}.or.any must be non-empty array`);
      return false;
    }
    return cond.or.any.every((c, i) => validateCondition(c as any, errors, `${prefix}.or.any[${i}]`));
  }
  errors.push(`${prefix} unknown operator`);
  return false;
}

function evalCondition(cond: Condition, event: any): boolean {
  if ('eq' in cond) {
    const left = getByPath(event, cond.eq.path);
    const right = normalizeValue(cond.eq.value, event);
    return left === right;
  }
  if ('gte' in cond) {
    const left = getByPath(event, cond.gte.path);
    return typeof left === 'number' && left >= cond.gte.value;
  }
  if ('lte' in cond) {
    const left = getByPath(event, cond.lte.path);
    return typeof left === 'number' && left <= cond.lte.value;
  }
  if ('and' in cond) return cond.and.all.every(c => evalCondition(c as any, event));
  if ('or' in cond)  return cond.or.any.some(c => evalCondition(c as any, event));
  return false;
}

function validateRuleData(rule: any): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!rule || typeof rule !== 'object') return { ok: false, errors: ['ruleData must be object'] };

  // eventKeys
  if (!Array.isArray(rule.eventKeys) || rule.eventKeys.length === 0)
    errors.push('eventKeys must be non-empty array');
  else {
    for (const k of rule.eventKeys) {
      if (!AllowedEventKeys.includes(k)) errors.push(`eventKeys contains unknown key: ${k}`);
    }
  }

  // progress spec
  const p = rule.progress;
  if (!p || typeof p !== 'object') errors.push('progress missing');
  else {
    if (!['count','binary','streak'].includes(p.kind)) errors.push('progress.kind invalid (count|binary|streak)');
    if (!p.when) errors.push('progress.when missing');
    else validateCondition(p.when as any, errors, 'progress.when');
    if (p.kind === 'streak' && !p.resetWhen) errors.push('progress.resetWhen required for streak');
    if (p.kind === 'streak' && p.resetWhen) validateCondition(p.resetWhen as any, errors, 'progress.resetWhen');
  }

  // unlock
  if (!rule.unlock || !rule.unlock.gte || rule.unlock.gte.path !== 'progress') {
    errors.push('unlock must be { gte: { path: "progress", value: number } }');
  }

  return { ok: errors.length === 0, errors };
}

async function main() {
  const outDir = path.resolve(process.cwd(), 'reports');
  fs.mkdirSync(outDir, { recursive: true });

  const achievements = await prisma.achievement.findMany({
    orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }, { name: 'asc' }],
  });

  const eventKeyUsage = new Map<string, number>();
  const categories = new Set<string>();
  const rows: any[] = [];

  for (const a of achievements) {
    categories.add((a as any).category ?? 'uncategorized');

    let rule: RuleData | null = null;
    let ruleParseError: string | null = null;
    if ((a as any).ruleData != null) {
      try {
        rule = typeof (a as any).ruleData === 'string'
          ? JSON.parse((a as any).ruleData)
          : (a as any).ruleData;
        // Count eventKey usage
        if (Array.isArray(rule?.eventKeys)) {
          for (const k of rule!.eventKeys) {
            eventKeyUsage.set(k, (eventKeyUsage.get(k) ?? 0) + 1);
          }
        }
      } catch (e: any) {
        ruleParseError = e?.message || 'Invalid JSON in ruleData';
      }
    }

    const validation = rule ? validateRuleData(rule) : { ok: false, errors: ['ruleData missing/null for auto award'] };

    // Heuristic "canUnlock" assessment
    const autoAward = (a as any).autoAward ?? true;
    const manualOnly = (a as any).manualOnly ?? false;
    const isActive = (a as any).isActive ?? true;
    const hasEvents = !!rule?.eventKeys?.length;
    const hasValidRule = rule ? validation.ok : false;
    const canUnlock = isActive && autoAward && !manualOnly && hasEvents && hasValidRule;

    rows.push({
      id: a.id,
      slug: (a as any).slug ?? a.id,
      key: (a as any).key ?? (a as any).slug ?? a.id,
      name: a.name,
      description: (a as any).description ?? '',
      category: (a as any).category ?? 'uncategorized',
      isActive,
      autoAward,
      manualOnly,
      points: (a as any).points ?? 0,
      muskBucksReward: (a as any).muskBucksReward ?? 0,
      ruleData: rule,
      ruleParseError,
      ruleValidation: validation,
      canUnlock,
    });
  }

  // JSON output
  const jsonPath = path.join(outDir, 'achievements_report.json');
  fs.writeFileSync(jsonPath, JSON.stringify({
    generatedAt: new Date().toISOString(),
    total: achievements.length,
    categories: Array.from(categories).sort(),
    allowedEventKeys: AllowedEventKeys,
    eventKeyUsage: Array.from(eventKeyUsage.entries()).sort(([a],[b]) => a.localeCompare(b)),
    achievements: rows,
  }, null, 2));

  // Markdown output
  const mk = new Array<string>();
  mk.push(`# Achievements Report`);
  mk.push(`Generated: ${new Date().toISOString()}`);
  mk.push(`Total achievements: **${achievements.length}**`);
  mk.push('');
  mk.push(`## Event Keys (usage in rules)`);
  for (const [k, n] of Array.from(eventKeyUsage.entries()).sort(([a],[b]) => a.localeCompare(b))) {
    const known = AllowedEventKeys.includes(k) ? '✅' : '❌';
    mk.push(`- ${known} \`${k}\` — used ${n} rule(s)`);
  }
  mk.push('');
  for (const cat of Array.from(categories).sort()) {
    mk.push(`## Category: ${cat}`);
    const list = rows.filter(r => r.category === cat);
    for (const r of list) {
      mk.push(`### ${r.slug} — ${r.name} ${r.isActive ? '' : ' (inactive)'}`);
      mk.push(`- key: \`${r.key}\``);
      mk.push(`- autoAward: ${r.autoAward} | manualOnly: ${r.manualOnly} | canUnlock: ${r.canUnlock ? '✅' : '❌'}`);
      mk.push(`- points: ${r.points} | muskBucksReward: ${r.muskBucksReward}`);
      mk.push(`- ruleData valid: ${r.ruleValidation.ok ? '✅' : '❌'}`);
      if (!r.ruleValidation.ok || r.ruleParseError) {
        mk.push(`- issues:`);
        if (r.ruleParseError) mk.push(`  - parse: ${r.ruleParseError}`);
        for (const e of r.ruleValidation.errors) mk.push(`  - ${e}`);
      }
      mk.push('');
      mk.push(`<details><summary>ruleData</summary>`);
      mk.push('');
      mk.push('```json');
      mk.push(JSON.stringify(r.ruleData ?? null, null, 2));
      mk.push('```');
      mk.push('');
      mk.push('</details>');
      mk.push('');
    }
  }
  const mdPath = path.join(outDir, 'achievements_report.md');
  fs.writeFileSync(mdPath, mk.join('\n'));

  console.log(`✅ Wrote: ${jsonPath}`);
  console.log(`✅ Wrote: ${mdPath}`);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
