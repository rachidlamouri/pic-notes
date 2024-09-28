import { ExpressionNode } from './expressionNode';
import { OperationNodeName } from './nodeName';
import { ParsedNode } from './parsedNode';

export abstract class OperationNode<
  TName extends OperationNodeName,
> extends ParsedNode<TName> {
  abstract left: ExpressionNode;
  abstract right: ExpressionNode;
}

export type GenericOperationNode = OperationNode<OperationNodeName>;
