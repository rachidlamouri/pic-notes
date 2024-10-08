import { hasExactlyOne } from '../utils/hasExactlyOne';
import { CategorizedArgs, CategorizedArgOption } from './categorizeArgs';
import { OptionConfig } from './optionConfig';
import { ParseableType } from './parseableType';
import { ParseArgsError } from './ParseArgsError';
import { GeneralizedParsedArgs, ParsedArgs } from './parsedArgs';
import {
  ParsedBooleanOption,
  ParsedNumberOption,
  ParsedOption,
  ParsedStringList,
  ParsedStringOption,
} from './parsedOption';
import {
  GeneralizedParsedPositional,
  ParsedPositional,
  IsRequired,
} from './parsedPositional';
import { parseNumber } from './parseNumber';
import { PositionalConfig } from './positionalConfig';

export const parseCategorizedArgs = <
  TPositionalConfigs extends readonly PositionalConfig[],
  TOptionConfigs extends readonly OptionConfig[],
>(
  categorizedArgs: CategorizedArgs,
  positionalConfigs: TPositionalConfigs,
  optionConfigs: TOptionConfigs,
): ParsedArgs<TPositionalConfigs, TOptionConfigs> => {
  const configuredPositionals = positionalConfigs
    .map((config, index) => {
      const value = categorizedArgs.positionals[index];

      if (config.isRequired && value === undefined) {
        throw new ParseArgsError(`Missing arg at position: ${index}`);
      }

      const parsedValue =
        config.type === ParseableType.String
          ? value
          : parseNumber(value, 'position', `${index}`);

      return {
        type: config.type,
        value: parsedValue,
      } satisfies GeneralizedParsedPositional as ParsedPositional<IsRequired>;
    })
    .map((positional) => {
      return positional.value;
    });

  const otherPositionals = categorizedArgs.positionals.slice(
    positionalConfigs.length,
  );

  const categorizedArgOptionMap = new Map<
    CategorizedArgOption['name'],
    CategorizedArgOption
  >(
    categorizedArgs.options.map((option) => {
      return [option.name, option];
    }),
  );

  const options = optionConfigs
    .filter((config) => {
      const option = categorizedArgOptionMap.get(config.name);
      return option !== undefined || config.type === ParseableType.Boolean;
    })
    .map<ParsedOption>((config) => {
      const option = categorizedArgOptionMap.get(config.name);

      if (config.type === ParseableType.Boolean) {
        return {
          name: config.name,
          type: config.type,
          value: option !== undefined,
        } satisfies ParsedBooleanOption;
      }

      if (option === undefined) {
        throw new ParseArgsError(`Missing option named: ${config.name}`);
      }

      if (config.type === ParseableType.StringList) {
        return {
          name: config.name,
          type: config.type,
          value: option.variables,
        } satisfies ParsedStringList;
      }

      if (!hasExactlyOne(option.variables)) {
        throw new ParseArgsError(
          `Option "${config.name}" must have exactly one variable.`,
        );
      }

      const value = option.variables[0];

      if (config.type === ParseableType.String) {
        return {
          name: config.name,
          type: config.type,
          value: value,
        } satisfies ParsedStringOption;
      }

      const numericValue = Number.parseInt(value, 10);
      if (Number.isNaN(numericValue)) {
        throw new ParseArgsError(`Invalid number for option: ${config.name}`);
      }

      return {
        name: config.name,
        type: config.type,
        value: numericValue,
      } satisfies ParsedNumberOption;
    });

  const defaultListOptions = optionConfigs
    .filter((config) => config.type === ParseableType.StringList)
    .map((config) => {
      return [config.name, []];
    });

  return {
    positionals: [...configuredPositionals, ...otherPositionals],
    options: Object.fromEntries([
      ...defaultListOptions,
      ...options.map((option) => {
        return [option.name, option.value];
      }),
    ]),
  } satisfies GeneralizedParsedArgs as unknown as ParsedArgs<
    TPositionalConfigs,
    TOptionConfigs
  >;
};
