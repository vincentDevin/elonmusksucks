// apps/client/src/theme/utils/theme-migration.ts

/**
 * Migration utilities to convert hardcoded Tailwind classes to theme variables
 */

// Map of Tailwind color classes to semantic theme variables
export const colorClassMigrationMap: Record<string, string> = {
  // Background colors
  'bg-white': 'bg-surface',
  'bg-gray-50': 'bg-background',
  'bg-gray-100': 'bg-muted',
  'bg-gray-800': 'bg-surface',
  'bg-gray-900': 'bg-background',
  'bg-black': 'bg-background',

  // Text colors
  'text-white': 'text-content',
  'text-black': 'text-content',
  'text-gray-500': 'text-tertiary',
  'text-gray-600': 'text-tertiary',
  'text-gray-700': 'text-content',
  'text-gray-800': 'text-content',
  'text-gray-900': 'text-content',

  // Border colors
  'border-gray-200': 'border-muted',
  'border-gray-300': 'border-muted',
  'border-gray-700': 'border-muted',

  // Primary colors (blue variants)
  'bg-blue-500': 'bg-primary',
  'bg-blue-600': 'bg-primary',
  'text-blue-500': 'text-primary',
  'text-blue-600': 'text-primary',
  'border-blue-500': 'border-primary',

  // Success colors (green variants)
  'bg-green-500': 'bg-success',
  'bg-green-600': 'bg-success',
  'text-green-500': 'text-success',
  'text-green-600': 'text-success',
  'border-green-500': 'border-success',
  'bg-emerald-500': 'bg-success',
  'text-emerald-500': 'text-success',

  // Warning colors (yellow/amber variants)
  'bg-yellow-500': 'bg-warning',
  'bg-amber-500': 'bg-warning',
  'text-yellow-500': 'text-warning',
  'text-amber-500': 'text-warning',
  'border-yellow-500': 'border-warning',

  // Error colors (red variants)
  'bg-red-500': 'bg-error',
  'bg-red-600': 'bg-error',
  'text-red-500': 'text-error',
  'text-red-600': 'text-error',
  'border-red-500': 'border-error',

  // Info colors (blue variants)
  'bg-sky-500': 'bg-info',
  'text-sky-500': 'text-info',
  'border-sky-500': 'border-info',
};

/**
 * Convert a single Tailwind class to semantic theme class
 */
export const migrateColorClass = (className: string): string => {
  return colorClassMigrationMap[className] || className;
};

/**
 * Migrate a full className string
 */
export const migrateClassNames = (classNames: string): string => {
  return classNames
    .split(' ')
    .map((cls) => migrateColorClass(cls.trim()))
    .join(' ');
};

/**
 * Find all hardcoded color classes in a string
 */
export const findHardcodedColorClasses = (content: string): string[] => {
  const colorClassRegex =
    /(bg|text|border)-(white|black|gray|red|green|blue|yellow|amber|emerald|sky|purple|pink|indigo)-\d+/g;
  return content.match(colorClassRegex) || [];
};

/**
 * Generate migration suggestions for a file
 */
export const generateMigrationSuggestions = (
  fileContent: string,
): {
  originalClass: string;
  suggestedClass: string;
  line?: number;
}[] => {
  const suggestions: { originalClass: string; suggestedClass: string; line?: number }[] = [];
  const lines = fileContent.split('\n');

  lines.forEach((line, lineIndex) => {
    const hardcodedClasses = findHardcodedColorClasses(line);
    hardcodedClasses.forEach((originalClass) => {
      const suggestedClass = migrateColorClass(originalClass);
      if (originalClass !== suggestedClass) {
        suggestions.push({
          originalClass,
          suggestedClass,
          line: lineIndex + 1,
        });
      }
    });
  });

  return suggestions;
};

/**
 * Auto-migrate file content (use with caution)
 */
export const autoMigrateFileContent = (
  content: string,
): {
  migratedContent: string;
  changes: { from: string; to: string; count: number }[];
} => {
  let migratedContent = content;
  const changes: { from: string; to: string; count: number }[] = [];

  Object.entries(colorClassMigrationMap).forEach(([from, to]) => {
    const regex = new RegExp(`\\b${from}\\b`, 'g');
    const matches = content.match(regex);
    if (matches && matches.length > 0) {
      migratedContent = migratedContent.replace(regex, to);
      changes.push({ from, to, count: matches.length });
    }
  });

  return { migratedContent, changes };
};

/**
 * Legacy theme ID migration from old dashboard customization
 */
export const migrateLegacyThemeId = (oldThemeId: string): string => {
  const migrationMap: Record<string, string> = {
    'dark-trader': 'dark-professional',
    'clean-professional': 'clean-professional',
    'neon-gaming': 'neon-gaming',
    'high-contrast': 'high-contrast',
  };

  return migrationMap[oldThemeId] || 'clean-professional'; // fallback
};

/**
 * Migrate legacy dashboard preferences to new theme system
 */
export const migrateLegacyPreferences = (
  legacyPrefs: any,
): {
  themeId: string;
  preferences: any;
} => {
  const themeId = legacyPrefs?.theme
    ? migrateLegacyThemeId(legacyPrefs.theme)
    : 'clean-professional';

  // Extract non-theme preferences
  const { theme, ...otherPrefs } = legacyPrefs || {};

  return {
    themeId,
    preferences: otherPrefs,
  };
};
