import { assertIsNotUndefined } from '../utils/assertIsNotUndefined';
import { OptionConfig } from './optionConfig';
import { ParseableType } from './parseableType';

export type CategorizedArgOption = {
  name: string;
  variables: string[];
};

export type CategorizedArgs = {
  positionals: string[];
  options: CategorizedArgOption[];
};

export const categorizeArgs = (
  optionConfigMap: Map<OptionConfig['name'], OptionConfig>,
  args: string[],
): CategorizedArgs => {
  const firstOptionIndex = args.findIndex((arg) => arg.startsWith('-'));

  const initialPositionals =
    firstOptionIndex === -1 ? args : args.slice(0, firstOptionIndex);

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

    return {
      name: optionName,
      variables,
    } satisfies CategorizedArgOption;
  });

  const scatteredPositionals = options
    .filter((option) => {
      const optionConfig = optionConfigMap.get(option.name);
      return optionConfig?.type === ParseableType.Boolean;
    })
    .flatMap((option) => option.variables);

  return {
    positionals: [...initialPositionals, ...scatteredPositionals],
    options,
  };
};
