export enum SetOperationNodeName {
  IntersectionOperation = 'IntersectionOperation',
  UnionOperation = 'UnionOperation',
  DifferenceOperation = 'DifferenceOperation',
}

export enum LookupOperationNodeName {
  SelectAllOperation = 'SelectAllOperation',
  HasExactTagValuesOperation = 'HasExactTagValuesOperation',
  HasAllTagValuesOperation = 'HasAllTagValuesOperation',
  HasAnyTagValueOperation = 'HasAnyTagValueOperation',
  HasTagNameOperation = 'HasTagNameOperation',
}

export type SearchOperationNodeName =
  | LookupOperationNodeName
  | SetOperationNodeName;

export type SearchNodeName = SearchOperationNodeName;
