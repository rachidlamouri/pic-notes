export enum NodeName {
  Tag = 'Tag',
  Intersection = 'Intersection',
  Union = 'Union',
  Difference = 'Difference',
}

export type OperationNodeName = Exclude<NodeName, NodeName.Tag>;
