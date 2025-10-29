// apps/client/src/utils/predictionColors.ts
// Centralized prediction option color management
import { PredictionType } from '@ems/types';
import type { UnifiedTheme } from '../theme/types';

/**
 * Hex to Tailwind color mapping for prediction colors
 * Maps hex values from theme to Tailwind utility classes
 */
const HEX_TO_TAILWIND: Record<string, string> = {
  // Indigo
  '#6366F1': 'indigo-500',
  // Violet
  '#8B5CF6': 'violet-500',
  // Yellow
  '#FACC15': 'yellow-400',
  // Orange
  '#F97316': 'orange-500',
  // Pink
  '#EC4899': 'pink-500',
  // Cyan
  '#06B6D4': 'cyan-500',
  // Purple
  '#A855F7': 'purple-500',
  // Lime
  '#84CC16': 'lime-500',
};

/**
 * Get the color palette for a specific prediction type
 */
export function getPredictionPalette(
  theme: UnifiedTheme,
  predictionType: PredictionType,
): string[] {
  const { predictionOptions } = theme;

  switch (predictionType) {
    case PredictionType.BINARY:
      return predictionOptions.binary;
    case PredictionType.OVER_UNDER:
      return predictionOptions.overUnder;
    case PredictionType.MULTIPLE:
    default:
      return predictionOptions.palette;
  }
}

/**
 * Get the color for a specific option index
 * Handles cycling for predictions with more options than palette colors
 */
export function getOptionColor(
  theme: UnifiedTheme,
  predictionType: PredictionType,
  optionIndex: number,
): string {
  const palette = getPredictionPalette(theme, predictionType);
  return palette[optionIndex % palette.length];
}

/**
 * Get Tailwind color name from hex value
 */
function getTailwindColor(hex: string): string {
  return HEX_TO_TAILWIND[hex] || 'gray-500';
}

/**
 * Generate Tailwind utility classes for a given option color
 */
export function getOptionClasses(
  theme: UnifiedTheme,
  predictionType: PredictionType,
  optionIndex: number,
) {
  const hexColor = getOptionColor(theme, predictionType, optionIndex);
  const tailwindColor = getTailwindColor(hexColor);

  return {
    // Background classes
    bg: `bg-${tailwindColor}`,
    bgTint: `bg-${tailwindColor}/10`,
    bgHover: `hover:bg-${tailwindColor}/20`,

    // Border classes
    border: `border-${tailwindColor}`,
    borderTint: `border-${tailwindColor}/40`,

    // Text classes
    text: `text-${tailwindColor}`,

    // Glow effects
    glow: `shadow-lg shadow-${tailwindColor}/50`,

    // Raw hex value (for inline styles)
    hex: hexColor,
  };
}

/**
 * Get all option colors for a prediction (useful for charts/graphs)
 */
export function getAllOptionColors(
  theme: UnifiedTheme,
  predictionType: PredictionType,
  optionCount: number,
): string[] {
  const palette = getPredictionPalette(theme, predictionType);
  return Array.from({ length: optionCount }, (_, i) => palette[i % palette.length]);
}

/**
 * Legacy helper - returns array of hex colors for backward compatibility
 * @deprecated Use getPredictionPalette or getAllOptionColors instead
 */
export function getOptionColorArray(theme: UnifiedTheme, predictionType: PredictionType): string[] {
  return getPredictionPalette(theme, predictionType);
}

/**
 * Get border color classes mapping (for backward compatibility)
 */
export function getBorderColorMap(theme: UnifiedTheme, predictionType: PredictionType) {
  const palette = getPredictionPalette(theme, predictionType);
  const map: Record<string, string> = {};

  palette.forEach((hex) => {
    const tailwind = getTailwindColor(hex);
    map[`bg-${tailwind}`] = `border-${tailwind}`;
  });

  return map;
}

/**
 * Get text color classes mapping (for backward compatibility)
 */
export function getTextColorMap(theme: UnifiedTheme, predictionType: PredictionType) {
  const palette = getPredictionPalette(theme, predictionType);
  const map: Record<string, string> = {};

  palette.forEach((hex) => {
    const tailwind = getTailwindColor(hex);
    map[`bg-${tailwind}`] = `text-${tailwind}`;
  });

  return map;
}

/**
 * Get background tint classes mapping (for backward compatibility)
 */
export function getBgTintMap(theme: UnifiedTheme, predictionType: PredictionType) {
  const palette = getPredictionPalette(theme, predictionType);
  const map: Record<string, string> = {};

  palette.forEach((hex) => {
    const tailwind = getTailwindColor(hex);
    map[`bg-${tailwind}`] = `bg-${tailwind}/10 hover:bg-${tailwind}/20`;
  });

  return map;
}

/**
 * Get glow effect classes mapping (for backward compatibility)
 */
export function getGlowEffectMap(theme: UnifiedTheme, predictionType: PredictionType) {
  const palette = getPredictionPalette(theme, predictionType);
  const map: Record<string, string> = {};

  palette.forEach((hex) => {
    const tailwind = getTailwindColor(hex);
    map[`bg-${tailwind}`] = `shadow-lg shadow-${tailwind}/50`;
  });

  return map;
}
