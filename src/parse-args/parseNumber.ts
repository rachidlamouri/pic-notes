import { ParseArgsError } from './ParseArgsError';

export function parseNumber(
  value: string | undefined,
  type: 'position' | 'option',
  id: string,
): number | undefined {
  if (value === undefined) {
    return undefined;
  }

  const numericValue = Number.parseInt(value, 10);
  if (Number.isNaN(numericValue)) {
    throw new ParseArgsError(`Invalid number for ${type}: ${id}`);
  }

  return numericValue;
}
