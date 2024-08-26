export function withExit<TCallable extends (...args: any[]) => void>(
  exitCode: number,
  callable: TCallable,
  ...args: Parameters<typeof callable>
): never {
  callable(...args);
  process.exit(exitCode);
}
