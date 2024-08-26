import { PositionalConfig } from './positionalConfig';
import { OptionConfig } from './optionConfig';
import { categorizeArgs } from './categorizeArgs';
import { ParsedArgs } from './parsedArgs';
import { parseCategorizedArgs } from './parseCategorizedArgs';

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
  const optionConfigMap = new Map(
    optionConfigs.map((option) => {
      return [option.name, option];
    }),
  );

  const categorizedArgs = categorizeArgs(optionConfigMap, args);
  const parsedArgs = parseCategorizedArgs(
    categorizedArgs,
    positionalConfigs,
    optionConfigs,
  );

  return parsedArgs;
};
