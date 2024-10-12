import { ParsedNode } from '../parsedNode';
import { ModificationNodeName } from './modificationNodeName';

export abstract class ModificationNode<
  TName extends ModificationNodeName,
> extends ParsedNode<TName> {}
