import { LookupOperationNodeName } from '../searchNodeName';
import { SearchOperationNode } from '../searchOperationNode';

export class HasAnyTagValueOperationNode extends SearchOperationNode<LookupOperationNodeName.HasAnyTagValueOperation> {
  constructor(public tagName: string, public tagValueList: string[]) {
    super(LookupOperationNodeName.HasAnyTagValueOperation);
  }
}
