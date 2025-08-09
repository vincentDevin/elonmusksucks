// apps/client/src/theme/index.ts

// Main exports for the unified theme system
export { UnifiedThemeProvider } from './UnifiedThemeProvider';

// Theme components
export {
  LightDarkToggle,
  AdvancedThemeSelector,
  QuickThemeSwitcher,
  ThemePreview,
  ThemeDemo,
  MigrationStatus,
} from './components';

// Theme hooks
export {
  useUnifiedTheme,
  useLightDark,
  useAdvancedThemes,
  useThemeVariables,
} from './hooks/useUnifiedTheme';

// Theme data and utilities
export {
  allThemes,
  lightThemes,
  darkThemes,
  contrastThemes,
  getThemesByCategory,
  getThemeById,
  getDefaultThemeForCategory,
  themeCategories,
  DEFAULT_LIGHT_THEME,
  DEFAULT_DARK_THEME,
  DEFAULT_CONTRAST_THEME,
} from './themes';

// Utilities
export {
  applyThemeToDocument,
  getThemeVariables,
  getPreferredColorScheme,
  getStoredThemeId,
  storeThemeId,
  themeToCSSString,
  themeMatchesSystem,
  getContrastColor,
} from './utils/theme-utils';

// Migration utilities
export {
  colorClassMigrationMap,
  migrateColorClass,
  migrateClassNames,
  findHardcodedColorClasses,
  generateMigrationSuggestions,
  autoMigrateFileContent,
  migrateLegacyThemeId,
  migrateLegacyPreferences,
} from './utils/theme-migration';

// TypeScript types
export type {
  UnifiedTheme,
  ThemeCategory,
  ThemePreferences,
  UnifiedThemeContextValue,
} from './types';
