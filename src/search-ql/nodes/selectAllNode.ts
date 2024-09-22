import { NodeName } from './nodeName';
import { ParsedNode } from './parsedNode';

export class SelectAllNode extends ParsedNode<NodeName.SelectAll> {
  constructor() {
    super(NodeName.SelectAll);
  }
}
