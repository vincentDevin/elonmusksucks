// apps/client/src/theme/utils/validate-migration.ts

/**
 * Migration validation utilities
 */

export interface ValidationResult {
  step: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  details?: string;
}

export function validateMigration(): ValidationResult[] {
  const results: ValidationResult[] = [];

  // Check 1: UnifiedThemeProvider is active
  try {
    const hasThemeVariables = getComputedStyle(document.documentElement).getPropertyValue(
      '--color-primary',
    );
    results.push({
      step: 'UnifiedThemeProvider Installation',
      status: hasThemeVariables ? 'pass' : 'fail',
      message: hasThemeVariables ? 'Theme variables are active' : 'No theme variables found',
      details: hasThemeVariables
        ? `Primary color: ${hasThemeVariables}`
        : 'Check App.tsx provider setup',
    });
  } catch (error) {
    results.push({
      step: 'UnifiedThemeProvider Installation',
      status: 'fail',
      message: 'Error checking theme variables',
      details: String(error),
    });
  }

  // Check 2: Theme persistence
  const storedTheme = localStorage.getItem('theme');
  results.push({
    step: 'Theme Persistence',
    status: storedTheme ? 'pass' : 'warning',
    message: storedTheme ? 'Theme is persisted' : 'No theme stored (using default)',
    details: storedTheme || 'Will use system preference or default theme',
  });

  // Check 3: Old theme contexts removed
  const hasOldThemeClasses =
    document.querySelector('.dark') || document.querySelector('[class*="theme-"]');
  results.push({
    step: 'Legacy Theme Cleanup',
    status: hasOldThemeClasses ? 'warning' : 'pass',
    message: hasOldThemeClasses
      ? 'Old theme classes still present'
      : 'Legacy theme classes cleaned up',
    details: hasOldThemeClasses
      ? 'Check for remaining .dark or theme-* classes'
      : 'Clean migration',
  });

  // Check 4: CSS variables applied
  try {
    const root = document.documentElement;
    const primaryColor = getComputedStyle(root).getPropertyValue('--color-primary');
    const surfaceColor = getComputedStyle(root).getPropertyValue('--color-surface');
    const contentColor = getComputedStyle(root).getPropertyValue('--color-content');

    const hasAllColors = primaryColor && surfaceColor && contentColor;
    results.push({
      step: 'CSS Variables System',
      status: hasAllColors ? 'pass' : 'fail',
      message: hasAllColors ? 'All theme variables are active' : 'Missing theme variables',
      details: `Primary: ${primaryColor}, Surface: ${surfaceColor}, Content: ${contentColor}`,
    });
  } catch (error) {
    results.push({
      step: 'CSS Variables System',
      status: 'fail',
      message: 'Error reading CSS variables',
      details: String(error),
    });
  }

  // Check 5: Theme switching functionality
  try {
    // This is a basic check - in a real app you'd test actual switching
    const themeProvider = document.querySelector('[class*="theme-"]');
    results.push({
      step: 'Theme Switching',
      status: themeProvider ? 'pass' : 'warning',
      message: themeProvider ? 'Theme system is active' : 'Theme system may not be active',
      details: 'Manual testing required for full validation',
    });
  } catch (error) {
    results.push({
      step: 'Theme Switching',
      status: 'fail',
      message: 'Error checking theme switching',
      details: String(error),
    });
  }

  return results;
}

export function generateMigrationReport(): {
  summary: string;
  passed: number;
  failed: number;
  warnings: number;
  results: ValidationResult[];
} {
  const results = validateMigration();

  const passed = results.filter((r) => r.status === 'pass').length;
  const failed = results.filter((r) => r.status === 'fail').length;
  const warnings = results.filter((r) => r.status === 'warning').length;

  let summary = '';
  if (failed === 0 && warnings === 0) {
    summary = '✅ Migration completed successfully!';
  } else if (failed === 0) {
    summary = '⚠️ Migration mostly complete with minor warnings';
  } else {
    summary = '❌ Migration has issues that need attention';
  }

  return {
    summary,
    passed,
    failed,
    warnings,
    results,
  };
}

export function printMigrationReport(): void {
  const report = generateMigrationReport();

  console.group('🎨 Theme Migration Report');
  console.log(report.summary);
  console.log(`Passed: ${report.passed}, Failed: ${report.failed}, Warnings: ${report.warnings}`);

  report.results.forEach((result) => {
    const icon = result.status === 'pass' ? '✅' : result.status === 'warning' ? '⚠️' : '❌';
    console.log(`${icon} ${result.step}: ${result.message}`);
    if (result.details) {
      console.log(`   Details: ${result.details}`);
    }
  });

  console.groupEnd();
}
