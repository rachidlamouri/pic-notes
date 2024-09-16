import { NodeName } from './nodeName';

export abstract class ParsedNode<TName extends NodeName> {
  constructor(public name: TName) {}
}
