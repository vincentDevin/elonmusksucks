// apps/client/src/pages/ThemeTest.tsx
import { ThemeDemo } from '../theme';

/**
 * Test page to validate the unified theme system migration
 * Useful for development and debugging theme issues
 */
export default function ThemeTest() {
  return (
    <div className="min-h-screen">
      <ThemeDemo />
    </div>
  );
}
