import { Meta } from '../../../commands/metadataManager';
import { ModificationOperationNodeName } from './modificationNodeName';
import { ModificationOperationNode } from './modificationOperationNode';

export class RenameTagOperationNode extends ModificationOperationNode<ModificationOperationNodeName.RenameTagOperation> {
  constructor(
    public oldTagName: string,
    public newTagName: string,
  ) {
    super(ModificationOperationNodeName.RenameTagOperation);
  }

  apply(meta: Meta): void {
    if (!meta.hasTag(this.oldTagName)) {
      return;
    }

    const tag = meta.getTag(this.oldTagName);
    tag.rename(this.newTagName);
  }
}
