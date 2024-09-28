import { OperationNode } from './operationNode';
import { NodeName } from './nodeName';
import { ExpressionNode } from './expressionNode';

export class DifferenceNode extends OperationNode<NodeName.Difference> {
  constructor(
    public left: ExpressionNode,
    public right: ExpressionNode,
  ) {
    super(NodeName.Difference);
  }
}
