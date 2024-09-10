export const hasAtLeastOne = <T>(list: T[]): list is [T, ...T[]] => {
  return list.length >= 1;
};
