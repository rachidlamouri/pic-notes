import { OperationNode } from './operationNode';
import { NodeName } from './nodeName';
import { ExpressionNode } from './expressionNode';

export class IntersectionNode extends OperationNode<NodeName.Intersection> {
  constructor(
    public left: ExpressionNode,
    public right: ExpressionNode,
  ) {
    super(NodeName.Intersection);
  }
}
