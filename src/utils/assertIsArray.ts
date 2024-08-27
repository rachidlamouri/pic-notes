import { assertIsString } from './assertIsString';

export const isArray = (value: unknown): value is unknown[] => {
  return Array.isArray(value);
};

export function assertIsArray(value: unknown): asserts value is unknown[] {
  if (!isArray(value)) {
    throw Error('Unexpected non-array');
  }
}

export function assertIsStringArray(list: unknown[]): asserts list is string[] {
  list.every(assertIsString);
}
