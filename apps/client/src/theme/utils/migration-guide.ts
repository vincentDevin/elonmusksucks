// apps/client/src/theme/utils/migration-guide.ts

/**
 * Migration guide and utilities for transitioning from old theme system to unified theme system
 */

export interface MigrationStep {
  id: string;
  title: string;
  description: string;
  files: string[];
  changes: string[];
  automated?: boolean;
}

export const MIGRATION_STEPS: MigrationStep[] = [
  {
    id: 'install-provider',
    title: '1. Install UnifiedThemeProvider',
    description: 'Replace the old ThemeProvider with UnifiedThemeProvider in your app root',
    files: ['src/main.tsx', 'src/App.tsx'],
    changes: [
      'Remove: import { ThemeProvider } from "./contexts/ThemeContext"',
      'Add: import { UnifiedThemeProvider } from "./theme"',
      'Replace: <ThemeProvider> with <UnifiedThemeProvider userId={user?.id}>',
      'Import theme CSS: import "./theme/theme-variables.css" in index.css',
    ],
    automated: false,
  },
  {
    id: 'update-navbar',
    title: '2. Update NavBar Component',
    description: 'Replace the old theme toggle with the new LightDarkToggle component',
    files: ['src/components/NavBar.tsx'],
    changes: [
      'Remove: import { useThemeContext } from "../contexts/ThemeContext"',
      'Add: import { LightDarkToggle } from "../theme"',
      'Replace theme toggle button with: <LightDarkToggle variant="icon" size="md" />',
      'Remove old theme toggle logic and state',
    ],
    automated: false,
  },
  {
    id: 'update-dashboard-settings',
    title: '3. Update Dashboard Settings',
    description:
      'DashboardSettings component removed - functionality moved to UnifiedDashboardSettings',
    files: ['src/components/dashboard/customization/UnifiedDashboardSettings.tsx'],
    changes: [
      'DashboardSettings.tsx deleted - superseded by UnifiedDashboardSettings',
      'All dashboard customization now handled by unified component',
    ],
    automated: true,
  },
  {
    id: 'remove-old-contexts',
    title: '4. Remove Old Theme Contexts',
    description: 'Clean up the old theme context and customization files',
    files: [
      'src/contexts/ThemeContext.tsx',
      'src/hooks/useTheme.ts',
      'src/hooks/useDashboardCustomization.ts',
      'src/components/dashboard/customization/ThemeSelector.tsx',
    ],
    changes: [
      'Delete: src/contexts/ThemeContext.tsx (replaced by UnifiedThemeProvider)',
      'Delete: src/hooks/useTheme.ts (replaced by useUnifiedTheme)',
      'Delete: ThemeSelector.tsx (replaced by AdvancedThemeSelector)',
      'Update imports in remaining files to use new theme system',
    ],
    automated: false,
  },
  {
    id: 'migrate-hardcoded-colors',
    title: '5. Migrate Hardcoded Colors',
    description: 'Convert Tailwind color classes to semantic theme variables',
    files: ['**/*.tsx', '**/*.css'],
    changes: [
      'Replace: bg-gray-100 → bg-muted',
      'Replace: text-gray-700 → text-content',
      'Replace: bg-blue-500 → bg-primary',
      'Replace: text-green-500 → text-success',
      'Replace: bg-red-500 → bg-error',
      'Use migration utility: autoMigrateFileContent()',
    ],
    automated: true,
  },
  {
    id: 'add-theme-switcher',
    title: '6. Add Quick Theme Switcher (Optional)',
    description: 'Add floating theme switcher for easy access from any page',
    files: ['src/App.tsx'],
    changes: [
      'Add: import { QuickThemeSwitcher } from "./theme"',
      'Add: <QuickThemeSwitcher position="bottom-right" hideOnMobile={false} />',
      'Position after main content for accessibility',
    ],
    automated: false,
  },
  {
    id: 'test-themes',
    title: '7. Test All Themes',
    description: 'Verify all theme categories work correctly across the application',
    files: ['All pages and components'],
    changes: [
      'Test light themes: Clean Professional, Warm Light, Mint Fresh',
      'Test dark themes: Dark Professional, Neon Gaming, Midnight Blue, Forest Dark',
      'Test contrast themes: High Contrast, High Contrast Light, Deuteranopia Friendly',
      'Verify theme persistence across page refreshes',
      'Check mobile responsiveness',
    ],
    automated: false,
  },
];

/**
 * Get migration progress for a project
 */
export function getMigrationProgress(): {
  completedSteps: string[];
  nextStep: MigrationStep | null;
  progress: number;
} {
  // This would be implemented to check actual file system
  // For now, return example data
  const completedSteps: string[] = [];
  const nextStep = MIGRATION_STEPS.find((step) => !completedSteps.includes(step.id)) || null;
  const progress = (completedSteps.length / MIGRATION_STEPS.length) * 100;

  return {
    completedSteps,
    nextStep,
    progress,
  };
}

/**
 * Code snippets for common migration patterns
 */
export const MIGRATION_SNIPPETS = {
  // App.tsx provider replacement
  provider: `
// Before:
import { ThemeProvider } from './contexts/ThemeContext';

function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

// After:
import { UnifiedThemeProvider } from './theme';
import { useAuth } from './contexts/AuthContext';

function App() {
  const { user } = useAuth();
  
  return (
    <UnifiedThemeProvider userId={user?.id}>
      <AppContent />
    </UnifiedThemeProvider>
  );
}
`,

  // NavBar theme toggle replacement
  navbar: `
// Before:
import { useThemeContext } from '../contexts/ThemeContext';

const { theme, toggleTheme } = useThemeContext();

<button onClick={toggleTheme}>
  {theme === 'light' ? <FaMoon /> : <FaSun />}
</button>

// After:
import { LightDarkToggle } from '../theme';

<LightDarkToggle variant="icon" size="md" />
`,

  // Dashboard settings replacement
  dashboard: `
// Before:
import ThemeSelector from './ThemeSelector';
import { useDashboardCustomization } from '../../../hooks/useDashboardCustomization';

<ThemeSelector />

// After:
import { AdvancedThemeSelector } from '../../../theme';

<AdvancedThemeSelector 
  showEffectControls={true}
  allowCategorySwitch={true}
/>
`,

  // Color class migration
  colors: `
// Before:
<div className="bg-gray-100 text-gray-700 border-gray-300">
  <button className="bg-blue-500 text-white">Primary</button>
  <span className="text-green-500">Success</span>
</div>

// After:
<div className="bg-muted text-content border-muted">
  <button className="bg-primary text-white">Primary</button>
  <span className="text-success">Success</span>
</div>
`,
};

/**
 * Validation checklist for completed migration
 */
export const MIGRATION_CHECKLIST = [
  'UnifiedThemeProvider is installed at app root',
  'Old ThemeContext and ThemeProvider are removed',
  'NavBar uses LightDarkToggle component',
  'Dashboard settings use AdvancedThemeSelector',
  'All hardcoded color classes are replaced with semantic classes',
  'All theme categories (light/dark/contrast) work correctly',
  'Theme persistence works across page refreshes',
  'Mobile theme switching works properly',
  'No console errors related to theme system',
  'Performance is acceptable with new theme system',
];

/**
 * Common migration issues and solutions
 */
export const MIGRATION_TROUBLESHOOTING = {
  'Theme not persisting': 'Ensure UnifiedThemeProvider has userId prop for authenticated users',
  'Colors not updating':
    'Check that CSS variables are being applied correctly, import theme-variables.css',
  'Component styling broken': 'Replace hardcoded Tailwind classes with semantic theme classes',
  'Multiple theme toggles': 'Remove old theme toggle components, use only LightDarkToggle',
  'Console errors about theme context':
    'Ensure all components use useUnifiedTheme instead of old hooks',
  'Slow theme switching': 'Check for heavy CSS recalculations, optimize selectors',
  'Mobile theme issues': 'Test LightDarkToggle with different sizes and variants',
  'Settings not saving': 'Verify theme preferences are stored in localStorage correctly',
};
