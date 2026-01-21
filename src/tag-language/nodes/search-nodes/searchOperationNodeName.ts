export enum SetOperationNodeName {
  IntersectionOperation = 'IntersectionOperation',
  UnionOperation = 'UnionOperation',
  DifferenceOperation = 'DifferenceOperation',
  FilterByDescriptionNode = 'FilterByDescriptionNode',
}

export enum LookupOperationNodeName {
  SelectAllOperation = 'SelectAllOperation',
  HasExactTagValuesOperation = 'HasExactTagValuesOperation',
  HasAllTagValuesOperation = 'HasAllTagValuesOperation',
  HasAnyTagValueOperation = 'HasAnyTagValueOperation',
  HasTagNameOperation = 'HasTagNameOperation',
}

export enum FilterNodeName {
  Description = 'Description',
}

export type SearchOperationNodeName =
  | LookupOperationNodeName
  | SetOperationNodeName;

export type SearchNodeName = SearchOperationNodeName | FilterNodeName;
