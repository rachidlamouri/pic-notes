export function assertIsNotNull<T>(
  value: T,
): asserts value is Exclude<T, null> {
  if (value === null) {
    throw Error('Unexpected null value');
  }
}
