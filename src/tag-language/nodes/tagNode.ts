import { Tag, TagName, TagValue } from '../../commands/metadataManager';
import { NodeName } from './nodeName';
import { ParsedNode } from './parsedNode';

export class TagNode extends ParsedNode<NodeName.Tag> {
  tag: Tag;

  constructor(tagName: TagName, tagValue: string[]) {
    super(NodeName.Tag);

    this.tag = new Tag(tagName, tagValue);
  }
}
