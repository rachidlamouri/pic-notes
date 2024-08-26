import { SharedUnionFieldsDeep } from 'type-fest';
import { ParseableType } from './parseableType';

export type IsRequired = true | undefined;

type ParsedStringPositional<TIsRequired extends IsRequired> = {
  type: ParseableType.String;
  value: TIsRequired extends true ? string : string | undefined;
};

type ParsedNumberPositional<TIsRequired extends IsRequired> = {
  type: ParseableType.Number;
  value: TIsRequired extends true ? number : number | undefined;
};

export type ParsedPositional<TIsRequired extends IsRequired> =
  | ParsedStringPositional<TIsRequired>
  | ParsedNumberPositional<TIsRequired>;

export type GeneralizedParsedPositional = SharedUnionFieldsDeep<
  ParsedPositional<IsRequired>
>;
