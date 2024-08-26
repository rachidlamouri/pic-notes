export const hasExactlyOne = <T>(list: T[]): list is [T] => {
  return list.length === 1;
};
