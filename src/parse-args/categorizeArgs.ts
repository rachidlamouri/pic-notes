import { assertIsNotUndefined } from '../utils/assertIsNotUndefined';
import { hasZeroOrOne } from '../utils/hasZeroOrOne';
import { ParseArgsError } from './ParseArgsError';

export type CategorizedArgOption = {
  name: string;
  variables: [] | [string];
};

export type CategorizedArgs = {
  positionals: string[];
  options: CategorizedArgOption[];
};

export const categorizeArgs = (args: string[]): CategorizedArgs => {
  const positionalEndIndex = args.findIndex((arg) => arg.startsWith('-'));

  const positionals =
    positionalEndIndex === -1 ? args : args.slice(0, positionalEndIndex);

  const indicies = args
    .map((thing, index) => {
      return thing.startsWith('-') ? index : -1;
    })
    .filter((index) => index >= 0);

  const options = indicies.map((optionIndex, listIndex) => {
    const nextOptionIndex = indicies[listIndex + 1] ?? args.length;

    const option = args[optionIndex];
    assertIsNotUndefined(option);

    const optionName = option.replace(/^--?/, '');
    const variables = args.slice(optionIndex + 1, nextOptionIndex);

    if (!hasZeroOrOne(variables)) {
      throw new ParseArgsError(`Option "${optionName}" has too many variables`);
    }

    return {
      name: optionName,
      variables,
    } satisfies CategorizedArgOption;
  });

  return {
    positionals,
    options,
  };
};
