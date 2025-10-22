/**
 * Safely converts a number to BigInt by flooring decimal values
 * Prevents "cannot convert to BigInt because it is not an integer" errors
 */
export function toBigInt(value: number | string | bigint): bigint {
  if (typeof value === 'bigint') {
    return value;
  }

  if (typeof value === 'string') {
    // Parse string and floor if it contains decimals
    const num = parseFloat(value);
    return BigInt(Math.floor(num));
  }

  // For numbers, floor to ensure integer
  return BigInt(Math.floor(value));
}

export function serializeBigInt(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'bigint') {
    return obj.toString();
  }

  if (Array.isArray(obj)) {
    return obj.map(serializeBigInt);
  }

  // Handle Date objects - return as-is so JSON.stringify converts them to ISO strings
  if (obj instanceof Date) {
    return obj;
  }

  if (typeof obj === 'object') {
    const serialized: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        serialized[key] = serializeBigInt(obj[key]);
      }
    }
    return serialized;
  }

  return obj;
}
