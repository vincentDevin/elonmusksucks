// apps/client/src/utils/formatting.ts

/**
 * Formats numbers in RuneScape gold stack style
 * Examples: 1234 -> 1.2k, 1500000 -> 1.5M, 2300000000 -> 2.3B
 */
export function formatMuskBucks(value: number | string | bigint): string {
  const num =
    typeof value === 'bigint'
      ? Number(value)
      : typeof value === 'string'
        ? parseFloat(value)
        : value;

  if (isNaN(num) || !isFinite(num)) return '0';

  const absNum = Math.abs(num);
  const sign = num < 0 ? '-' : '';

  if (absNum >= 1_000_000_000_000) {
    // Trillions (T)
    const formatted = (absNum / 1_000_000_000_000).toFixed(1);
    return `${sign}${formatted.replace(/\.0$/, '')}T`;
  } else if (absNum >= 1_000_000_000) {
    // Billions (B)
    const formatted = (absNum / 1_000_000_000).toFixed(1);
    return `${sign}${formatted.replace(/\.0$/, '')}B`;
  } else if (absNum >= 1_000_000) {
    // Millions (M)
    const formatted = (absNum / 1_000_000).toFixed(1);
    return `${sign}${formatted.replace(/\.0$/, '')}M`;
  } else if (absNum >= 10_000) {
    // Thousands (k) - only show for 10k+
    const formatted = (absNum / 1_000).toFixed(1);
    return `${sign}${formatted.replace(/\.0$/, '')}k`;
  } else {
    // Less than 10k - show full number with commas
    return `${sign}${absNum.toLocaleString()}`;
  }
}

/**
 * Gets the appropriate color classes for MuskBucks display based on amount
 * Higher amounts get more exciting colors
 */
export function getMuskBucksColorClasses(value: number | string | bigint): string {
  const num =
    typeof value === 'bigint'
      ? Number(value)
      : typeof value === 'string'
        ? parseFloat(value)
        : value;

  if (isNaN(num) || !isFinite(num)) return 'bg-muted text-content';

  const absNum = Math.abs(num);

  if (absNum >= 1_000_000_000) {
    // Billions+ - Legendary gold
    return 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-black shadow-lg';
  } else if (absNum >= 100_000_000) {
    // 100M+ - Epic purple/gold
    return 'bg-gradient-to-r from-purple-500 to-yellow-500 text-white shadow-md';
  } else if (absNum >= 10_000_000) {
    // 10M+ - Rare blue/purple
    return 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-md';
  } else if (absNum >= 1_000_000) {
    // 1M+ - Uncommon green/blue
    return 'bg-gradient-to-r from-green-500 to-blue-500 text-white';
  } else if (absNum >= 100_000) {
    // 100k+ - Nice green
    return 'bg-success text-surface';
  } else if (absNum >= 10_000) {
    // 10k+ - Warning/achievement yellow
    return 'bg-warning text-surface';
  } else {
    // Less than 10k - Default theme colors
    return 'bg-muted text-content';
  }
}
