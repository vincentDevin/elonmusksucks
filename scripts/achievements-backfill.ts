/* scripts/achievements-backfill.ts */
import fs from 'node:fs';
import path from 'node:path';

type Report = {
  achievements: Array<{
    id: string;
    slug: string;
    name: string;
    category?: string;
    isActive: boolean;
    autoAward: boolean;
    manualOnly?: boolean;
    ruleData?: any;
    ruleParseError?: string | null;
    ruleValidation: { ok: boolean; errors: string[] };
    canUnlock: boolean;
  }>;
};

function jsonRule(obj: any) {
  return JSON.stringify(obj, null, 2);
}

function ruleCountWin(target: number) {
  return {
    eventKeys: ['pong:match:completed'],
    progress: { kind: 'count', when: { eq: { path: 'data.winnerId', value: '$.userId' } } },
    unlock: { gte: { path: 'progress', value: target } },
  };
}
function ruleStreak(target: number) {
  return {
    eventKeys: ['pong:match:completed','pong:match:lost'],
    progress: {
      kind: 'streak',
      when: { eq: { path: 'data.winnerId', value: '$.userId' } },
      resetWhen: { eq: { path: 'key', value: 'pong:match:lost' } }
    },
    unlock: { gte: { path: 'progress', value: target } },
  };
}
function rulePerfect() {
  return {
    eventKeys: ['pong:match:completed'],
    progress: {
      kind: 'binary',
      when: { and: { all: [
        { eq: { path: 'data.winnerId', value: '$.userId' } },
        { eq: { path: 'data.winnerScore', value: 11 } },
        { eq: { path: 'data.loserScore', value: 0 } },
      ]}}
    },
    unlock: { gte: { path: 'progress', value: 1 } },
  };
}
function ruleAIDiff(diff: 'EASY'|'MEDIUM'|'HARD'|'IMPOSSIBLE') {
  return {
    eventKeys: ['pong:match:completed'],
    progress: {
      kind: 'binary',
      when: { and: { all: [
        { eq: { path: 'data.winnerId', value: '$.userId' } },
        { eq: { path: 'data.vsAI', value: true } },
        { eq: { path: 'data.aiDifficulty', value: diff } },
      ]}}
    },
    unlock: { gte: { path: 'progress', value: 1 } },
  };
}
function ruleHighroller(min: number) {
  return {
    eventKeys: ['pong:match:completed'],
    progress: {
      kind: 'binary',
      when: { and: { all: [
        { eq: { path: 'data.winnerId', value: '$.userId' } },
        { gte: { path: 'data.wager', value: min } },
      ]}}
    },
    unlock: { gte: { path: 'progress', value: 1 } },
  };
}

/** Prediction helpers */
function rulePredFirstBet() {
  return {
    eventKeys: ['prediction:bet:placed'],
    progress: { kind: 'count', when: { eq: { path: 'userId', value: '$.userId' } } },
    unlock: { gte: { path: 'progress', value: 1 } },
  };
}
function rulePredWinCount(n: number) {
  return {
    eventKeys: ['prediction:bet:settled'],
    progress: { kind: 'count', when: { and: { all: [
      { eq: { path: 'userId', value: '$.userId' } },
      { eq: { path: 'data.wasWinner', value: true } },
    ]}}},
    unlock: { gte: { path: 'progress', value: n } },
  };
}
function rulePredStreak(n: number) {
  return {
    eventKeys: ['prediction:bet:settled'],
    progress: {
      kind: 'streak',
      when: { and: { all: [
        { eq: { path: 'userId', value: '$.userId' } },
        { eq: { path: 'data.wasWinner', value: true } },
      ]}},
      resetWhen: { and: { any: [
        { eq: { path: 'key', value: 'prediction:bet:settled' } },
        { eq: { path: 'data.wasWinner', value: false } },
      ]}}
    },
    unlock: { gte: { path: 'progress', value: n } },
  };
}
function rulePredHighStake(min: number) {
  return {
    eventKeys: ['prediction:bet:placed'],
    progress: { kind: 'binary', when: { and: { all: [
      { eq: { path: 'userId', value: '$.userId' } },
      { gte: { path: 'data.stake', value: min } },
    ]}}},
    unlock: { gte: { path: 'progress', value: 1 } },
  };
}

function suggestRuleForSlug(cat: string, slug: string) {
  const s = slug.toLowerCase();
  if (cat === 'pong') {
    if (s.includes('first') && s.includes('win')) return ruleCountWin(1);
    if (s.includes('10') && s.includes('win')) return ruleCountWin(10);
    if (s.includes('50') && s.includes('win')) return ruleCountWin(50);
    if (s.includes('100') && s.includes('win')) return ruleCountWin(100);
    if (s.includes('streak') && s.includes('3')) return ruleStreak(3);
    if (s.includes('streak') && s.includes('5')) return ruleStreak(5);
    if (s.includes('streak') && s.includes('10')) return ruleStreak(10);
    if (s.includes('perfect') || s.includes('11-0')) return rulePerfect();
    if (s.includes('ai') && s.includes('easy')) return ruleAIDiff('EASY');
    if (s.includes('ai') && s.includes('medium')) return ruleAIDiff('MEDIUM');
    if (s.includes('ai') && s.includes('hard')) return ruleAIDiff('HARD');
    if (s.includes('ai') && s.includes('imp') ) return ruleAIDiff('IMPOSSIBLE');
    if (s.includes('highroller') || s.includes('10k')) return ruleHighroller(10000);
  }
  if (cat.includes('pred')) {
    if (s.includes('first') && (s.includes('bet') || s.includes('wager'))) return rulePredFirstBet();
    if (s.includes('first') && s.includes('win')) return rulePredWinCount(1);
    if (s.includes('10') && s.includes('win')) return rulePredWinCount(10);
    if (s.includes('streak') && s.includes('3')) return rulePredStreak(3);
    if (s.includes('highroller') || s.includes('10k')) return rulePredHighStake(10000);
  }
  return null;
}

function main() {
  const reportPath = path.resolve('reports/achievements_report.json');
  const txt = fs.readFileSync(reportPath, 'utf-8');
  const report: Report = JSON.parse(txt);

  const broken = report.achievements.filter(a =>
    a.isActive && a.autoAward && !a.manualOnly && (!a.ruleData || !a.ruleValidation?.ok));

  console.log(`Broken achievements (active+autoAward): ${broken.length}`);

  const pong = broken.filter(a => (a.category ?? '').toLowerCase().includes('pong'));
  const pred = broken.filter(a => (a.category ?? '').toLowerCase().includes('pred'));

  const blocks: string[] = [];
  function pushSQL(slug: string, rule: any) {
    blocks.push(
      `UPDATE "Achievement" SET "ruleData" = '${JSON.stringify(rule).replace(/'/g, "''")}' WHERE slug = '${slug}';`
    );
  }

  console.log(`\n=== Suggested Pong patches ===`);
  for (const a of pong) {
    const r = suggestRuleForSlug('pong', a.slug);
    if (r) pushSQL(a.slug, r);
    else console.log(`(manual) ${a.slug}`);
  }

  console.log(`\n=== Suggested Prediction patches ===`);
  for (const a of pred) {
    const r = suggestRuleForSlug('prediction', a.slug);
    if (r) pushSQL(a.slug, r);
    else console.log(`(manual) ${a.slug}`);
  }

  const outSql = path.resolve('reports/achievement_rule_patches.sql');
  fs.writeFileSync(outSql, blocks.join('\n') + '\n', 'utf-8');
  console.log(`\n📝 Wrote SQL patch file: ${outSql}`);
  console.log(`Review the SQL, then apply with: psql $DATABASE_URL -f ${outSql}`);
}
main();
