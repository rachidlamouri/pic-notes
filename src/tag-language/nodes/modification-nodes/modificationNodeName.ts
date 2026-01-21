export enum ModificationExpressionNodeName {
  value = 'ModificationExpression',
}

export enum ModificationOperationNodeName {
  AddTagOperation = 'AddTagOperation',
  RemoveTagOperation = 'RemoveTagOperation',
  SoftSetValueOperation = 'SoftSetValueOperation',
  HardSetValueOperation = 'HardSetValueOperation',
  AddValueOperation = 'AddValueOperation',
  RemoveValueOperation = 'RemoveValueOperation',
  RenameTagOperation = 'RenameTagOperation',
  AddDescriptionOperation = 'AddDescriptionOperation',
  RemoveDescriptionOperation = 'RemoveDescriptionOperation',
}

export type ModificationNodeName =
  | ModificationExpressionNodeName
  | ModificationOperationNodeName;
