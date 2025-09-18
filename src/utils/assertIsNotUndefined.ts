export const isNotUndefined = <T>(value: T): value is Exclude<T, undefined> => {
  return value !== undefined;
};

export function assertIsNotUndefined<T>(
  value: T,
): asserts value is Exclude<T, undefined> {
  const isUndefined = !isNotUndefined(value);
  if (isUndefined) {
    throw Error('Unexpected undefined value');
  }
}
