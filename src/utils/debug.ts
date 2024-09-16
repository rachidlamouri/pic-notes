export const debug: typeof console.log =
  process.env.DEBUG !== undefined ? console.log : () => {};
