/**
 * Dot-notation property resolver for automation conditions.
 * Safely navigates deeply nested properties without throwing runtime exceptions.
 */
export function getNestedProperty(obj: unknown, path: string): unknown {
  if (obj === null || obj === undefined || typeof obj !== 'object') {
    return undefined;
  }

  if (!path || typeof path !== 'string') {
    return undefined;
  }

  const parts = path.split('.');
  // intentional any: traversing arbitrary JSON object structures
  let current: any = obj;

  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined;
    }
    current = current[part];
  }

  return current;
}
