import P from 'parsimmon';
import { debug } from '../utils/debug';

/**
 * Creates a parser that always fails, but calls the given function. Use this in
 * P.alt to log information between alternate parsers
 */
export const tap = (fn: (...args: string[]) => void): P.Parser<never> => {
  return P((input, i) => {
    fn(input.charAt(i));
    return P.makeFailure(i, '');
  }) as P.Parser<never>;
};

let indent = 0;
export const indentDebug: typeof console.log = (...args) => {
  debug(indent.toString().padStart(2, ' '), ' |'.repeat(indent), ...args);
  if (indent > 30) {
    throw Error('Possibly infinite recursion detected');
  }
};

export type ResultType<TParser extends P.Parser<unknown>> =
  TParser extends P.Parser<infer TResult> ? TResult : never;

/**
 * Adds debug logs to a parser. Logs the following:
 *   - 'T' when a parser is tried
 *   - '_' when a parser finishes but has no data
 *   - 'M' when a parser finishes and has a match
 *   - '--' when a parser finishes and fails to match
 */
export const withIndentDebug = <TResult>(
  name: string,
  parser: P.Parser<TResult>,
): P.Parser<TResult> => {
  return P.alt<ResultType<typeof parser>>(
    tap(() => {
      indent += 1;
      indentDebug('T', name);
    }),
    parser.map((result) => {
      const letter = result === null ? '_' : 'M';
      indentDebug(letter, name, '"' + result + '"');
      indent -= 1;
      return result;
    }),
    tap(() => {
      indentDebug('--');
      indent -= 1;
    }),
  );
};
