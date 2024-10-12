import { ModificationNode } from './modificationNode';
import { ModificationExpressionNodeName } from './modificationNodeName';
import { GenericModificationOperationNode } from './modificationOperationNode';

export class ModificationExpressionNode extends ModificationNode<ModificationExpressionNodeName.value> {
  constructor(public operations: GenericModificationOperationNode[]) {
    super(ModificationExpressionNodeName.value);
  }
}
