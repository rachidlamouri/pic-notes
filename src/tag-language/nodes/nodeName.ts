export enum NodeName {
  SelectAll = 'SelectAll',
  Tag = 'Tag',
  Intersection = 'Intersection',
  Union = 'Union',
  Difference = 'Difference',
}

export type OperationNodeName = Exclude<NodeName, NodeName.Tag>;
