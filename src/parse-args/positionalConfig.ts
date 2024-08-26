import { ParseableType } from './parseableType';

export type PositionalConfig = {
  type: ParseableType.String | ParseableType.Number;
  isRequired?: true;
};
