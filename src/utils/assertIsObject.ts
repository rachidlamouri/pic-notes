import { assertIsString } from './assertIsString';

export function assertIsObject(
  value: unknown,
): asserts value is Record<string, unknown> {
  const isObject =
    typeof value === 'object' && value !== null && !Array.isArray(value);

  if (!isObject) {
    throw Error('Unexpected non-object');
  }
}

export function assertHasStringValues(
  object: Record<string, unknown>,
): asserts object is Record<string, string> {
  Object.values(object).every(assertIsString);
}
