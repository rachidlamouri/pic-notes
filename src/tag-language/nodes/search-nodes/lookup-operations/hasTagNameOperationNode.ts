import { LookupOperationNodeName } from '../searchNodeName';
import { SearchOperationNode } from '../searchOperationNode';

export class HasTagNameOperationNode extends SearchOperationNode<LookupOperationNodeName.HasTagNameOperation> {
  constructor(public tagName: string) {
    super(LookupOperationNodeName.HasTagNameOperation);
  }
}
