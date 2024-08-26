export const debug =
  process.env.DEBUG !== undefined
    ? (message: string) => {
        console.log(message);
      }
    : () => {};
