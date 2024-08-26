import {
  SharedUnionFieldsDeep,
  Simplify,
  UnionToIntersection,
} from 'type-fest';
import { assertIsNotUndefined } from './assertIsNotUndefined';

type IsRequired = true | undefined;

export enum ParseableType {
  Boolean = 'Boolean',
  String = 'String',
  Number = 'Number',
}

type CategorizedArgOption = {
  name: string;
  variables: [] | [string];
};

type CategorizedArgs = {
  positionals: string[];
  options: CategorizedArgOption[];
};

const hasExactlyOne = <T>(list: T[]): list is [T] => {
  return list.length === 1;
};

const hasZeroOrOne = <T>(list: T[]): list is [] | [T] => {
  return list.length <= 1;
};

const categorizeArgs = (args: string[]): CategorizedArgs => {
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

type PositionalConfig = {
  type: ParseableType.String | ParseableType.Number;
  isRequired?: true;
};

type BooleanOptionConfig = {
  name: string;
  type: ParseableType.Boolean;
};

type StringOptionConfig = {
  name: string;
  type: ParseableType.String;
};

type NumberOptionConfig = {
  name: string;
  type: ParseableType.Number;
};

type OptionConfig =
  | BooleanOptionConfig
  | StringOptionConfig
  | NumberOptionConfig;

type ParsedStringPositional<TIsRequired extends IsRequired> = {
  type: ParseableType.String;
  value: TIsRequired extends true ? string : string | undefined;
};

type ParsedNumberPositional<TIsRequired extends IsRequired> = {
  type: ParseableType.Number;
  value: TIsRequired extends true ? number : number | undefined;
};

type ParsedPositional<TIsRequired extends IsRequired> =
  | ParsedStringPositional<TIsRequired>
  // | ParsedStringPositional<false>
  | ParsedNumberPositional<TIsRequired>;
// | ParsedNumberPositional<false>;

type GeneralizedParsedPositional = SharedUnionFieldsDeep<
  ParsedPositional<IsRequired>
>;

type ParsedBooleanOption = {
  type: ParseableType.Boolean;
  name: string;
  value: boolean;
};

type ParsedStringOption = {
  type: ParseableType.String;
  name: string;
  value: string;
};

type ParsedNumberOption = {
  type: ParseableType.Number;
  name: string;
  value: number | undefined;
};

type ParsedOption =
  | ParsedBooleanOption
  | ParsedStringOption
  | ParsedNumberOption;

type ParsedArgs<
  TPositionalConfigs extends readonly PositionalConfig[],
  TOptionConfigs extends readonly OptionConfig[],
> = {
  positionals: {
    [TIndex in keyof TPositionalConfigs]: Extract<
      ParsedPositional<
        TPositionalConfigs[TIndex]['isRequired'] extends true ? true : undefined
      >,
      { type: TPositionalConfigs[TIndex]['type'] }
    >['value'];
  };
  options: Simplify<
    UnionToIntersection<
      {
        [TIndex in keyof TOptionConfigs]: {
          [TName in TOptionConfigs[TIndex]['name']]: Extract<
            ParsedOption,
            { type: TOptionConfigs[TIndex]['type'] }
          >['value'];
        };
      }[number]
    >
  >;
};

class ParseArgsError extends Error {}

const parseCategorizedArgs = <
  TPositionalConfigs extends readonly PositionalConfig[],
  TOptionConfigs extends readonly OptionConfig[],
>(
  parsed1: CategorizedArgs,
  positionalConfigs: TPositionalConfigs,
  optionConfigs: TOptionConfigs,
): ParsedArgs<TPositionalConfigs, TOptionConfigs> => {
  const positionals = positionalConfigs
    .map((config, index) => {
      const value = parsed1.positionals[index];

      if (config.isRequired && value === undefined) {
        throw new ParseArgsError(`Missing value at position: ${index}`);
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

  const parsed1OptionMap = new Map<
    CategorizedArgOption['name'],
    CategorizedArgOption
  >(
    parsed1.options.map((option) => {
      return [option.name, option];
    }),
  );

  const options = optionConfigs.map<ParsedOption>((config) => {
    const option = parsed1OptionMap.get(config.name);

    if (config.type === ParseableType.Boolean) {
      return {
        name: config.name,
        type: ParseableType.Boolean,
        value: option !== undefined,
      } satisfies ParsedBooleanOption;
    }

    if (option === undefined) {
      throw new ParseArgsError(`Missing option named: ${config.name}`);
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
        type: ParseableType.String,
        value: value,
      } satisfies ParsedStringOption;
    }

    const numericValue = Number.parseInt(value, 10);
    if (Number.isNaN(numericValue)) {
      throw new ParseArgsError(`Invalid number for option: ${config.name}`);
    }

    return {
      name: config.name,
      type: ParseableType.Number,
      value: numericValue,
    } satisfies ParsedNumberOption;
  });

  return {
    positionals,
    options: Object.fromEntries(
      options.map((option) => {
        return [option.name, option.value];
      }),
    ),
  } as unknown as ParsedArgs<TPositionalConfigs, TOptionConfigs>;
};

type ParseArgsInput<
  TPositionalConfigs extends readonly PositionalConfig[],
  TOptionConfig extends readonly OptionConfig[],
> = {
  args: string[];
  positionals: TPositionalConfigs;
  options: TOptionConfig;
};

export const parseArgs = <
  TPositionalConfigs extends readonly PositionalConfig[],
  TOptionConfigs extends readonly OptionConfig[],
>({
  args,
  positionals: positionalConfigs,
  options: optionConfigs,
}: ParseArgsInput<TPositionalConfigs, TOptionConfigs>): ParsedArgs<
  TPositionalConfigs,
  TOptionConfigs
> => {
  const categorizedArgs = categorizeArgs(args);
  const parsedArgs = parseCategorizedArgs(
    categorizedArgs,
    positionalConfigs,
    optionConfigs,
  );

  return parsedArgs;
};

const { positionals, options } = parseArgs({
  args: ['foo', '2', '3', '--foo', 'bar', '--baz', '-f', '4'],
  positionals: [
    {
      type: ParseableType.String,
    },
    {
      type: ParseableType.Number,
    },
    {
      type: ParseableType.String,
    },
  ] as const,
  options: [
    { name: 'foo', type: ParseableType.String },
    { name: 'baz', type: ParseableType.Boolean },
    { name: 'oof', type: ParseableType.Boolean },
    { name: 'f', type: ParseableType.Number },
  ] as const,
});

// const a = parse1(['foo', '2', 'potato', '--foo', 'bar', '--baz', '-f', '4']);

// const b = parse2(
//   a,
//   [
//     {
//       type: ParseableType.String,
//     },
//     {
//       type: ParseableType.Number,
//     },
//     {
//       type: ParseableType.String,
//     },
//   ],
//   [
//     { name: 'foo', type: ParseableType.String },
//     { name: 'baz', type: ParseableType.Boolean },
//     { name: 'oof', type: ParseableType.Boolean },
//     { name: 'f', type: ParseableType.Number },
//   ],
// );

// console.log(JSON.stringify(b, null, 2));

function parseNumber(
  value: string | undefined,
  type: 'position' | 'option',
  id: string,
): number | undefined {
  if (value === undefined) {
    return undefined;
  }

  const numericValue = Number.parseInt(value, 10);
  if (Number.isNaN(numericValue)) {
    throw new ParseArgsError(`Invalid number for ${type}: ${id}`);
  }

  return numericValue;
}
