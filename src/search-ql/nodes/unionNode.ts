import { NodeName } from './nodeName';
import { ExpressionNode } from './expressionNode';
import { OperationNode } from './operationNode';

export class UnionNode extends OperationNode<NodeName.Union> {
  constructor(
    public left: ExpressionNode,
    public right: ExpressionNode,
  ) {
    super(NodeName.Union);
  }
}
