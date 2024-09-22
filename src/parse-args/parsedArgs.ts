import {
  SharedUnionFieldsDeep,
  Simplify,
  UnionToIntersection,
} from 'type-fest';
import { OptionConfig } from './optionConfig';
import { ParsedOption } from './parsedOption';
import { ParsedPositional } from './parsedPositional';
import { PositionalConfig } from './positionalConfig';
import { ParseableType } from './parseableType';

export type ParsedArgs<
  TPositionalConfigs extends readonly PositionalConfig[],
  TOptionConfigs extends readonly OptionConfig[],
> = {
  positionals: [
    ...{
      [TIndex in keyof TPositionalConfigs]: Extract<
        ParsedPositional<
          TPositionalConfigs[TIndex]['isRequired'] extends true
            ? true
            : undefined
        >,
        { type: TPositionalConfigs[TIndex]['type'] }
      >['value'];
    },
    ...string[],
  ];
  options: Simplify<
    UnionToIntersection<
      {
        [TIndex in keyof TOptionConfigs]: {
          [TName in TOptionConfigs[TIndex]['name']]: TOptionConfigs[TIndex]['type'] extends ParseableType.Boolean
            ? Extract<
                ParsedOption,
                { type: TOptionConfigs[TIndex]['type'] }
              >['value']
            :
                | Extract<
                    ParsedOption,
                    { type: TOptionConfigs[TIndex]['type'] }
                  >['value']
                | undefined;
        };
      }[number]
    >
  >;
};

export type GeneralizedParsedArgs = SharedUnionFieldsDeep<
  ParsedArgs<PositionalConfig[], OptionConfig[]>
>;
