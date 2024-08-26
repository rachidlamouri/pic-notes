import { assertIsString } from './assertIsString';

export function assertIsArray(value: unknown): asserts value is unknown[] {
  if (!Array.isArray(value)) {
    throw Error('Unexpected non-array');
  }
}

export function assertIsStringArray(value: unknown): asserts value is string[] {
  assertIsArray(value);
  value.every(assertIsString);
}
