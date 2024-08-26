export function assertIsNotUndefined<T>(
  value: T,
): asserts value is Exclude<T, undefined> {
  if (value === undefined) {
    throw Error('Unexpected undefined value');
  }
}
