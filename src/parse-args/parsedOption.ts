import { ParseableType } from './parseableType';

export type ParsedBooleanOption = {
  type: ParseableType.Boolean;
  name: string;
  value: boolean;
};

export type ParsedStringOption = {
  type: ParseableType.String;
  name: string;
  value: string;
};

export type ParsedStringList = {
  type: ParseableType.StringList;
  name: string;
  value: string[];
};

export type ParsedNumberOption = {
  type: ParseableType.Number;
  name: string;
  value: number | undefined;
};

export type ParsedOption =
  | ParsedBooleanOption
  | ParsedStringOption
  | ParsedStringList
  | ParsedNumberOption;
