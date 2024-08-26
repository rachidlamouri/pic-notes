import { ParseableType } from './parseableType';

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

export type OptionConfig =
  | BooleanOptionConfig
  | StringOptionConfig
  | NumberOptionConfig;
