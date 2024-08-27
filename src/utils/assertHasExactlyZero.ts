export function assertHasExactlyZero(list: unknown[]): asserts list is [] {
  if (list.length !== 0) {
    throw new Error('Unexpected non-empty list');
  }
}
