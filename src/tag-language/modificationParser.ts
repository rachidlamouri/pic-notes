import { AddTagOperationNode } from './nodes/modification-nodes/addTagOperationNode';
import { ModificationExpressionNode } from './nodes/modification-nodes/modificationExpressionNode';
import {
  GenericModificationOperationNode,
  ModificationOperationNode,
} from './nodes/modification-nodes/modificationOperationNode';
import { createLanguage, parserDebugger, ul } from './parserUtils';
import P from 'parsimmon';
import { tl } from './tagParser';
import { assertIsArray } from '../utils/assertIsArray';
import { RemoveTagOperationNode } from './nodes/modification-nodes/removeTagOperationNode';
import { SoftSetValueOperationNode } from './nodes/modification-nodes/softSetValueOperationNode';
import { HardSetValueOperationNode } from './nodes/modification-nodes/hardSetValueOperationNode';
import { AddValueOperationNode } from './nodes/modification-nodes/addValueOperationNode';
import { RemoveValueOperationNode } from './nodes/modification-nodes/removeValueOperationNode';
import { AddDescriptionOperationNode } from './nodes/modification-nodes/addDescriptionOperationNode';
import { RemoveDescriptionOperationNode } from './nodes/modification-nodes/removeDescriptionOperationNode';
import { RenameTagOperationNode } from './nodes/modification-nodes/renameTagOperationNode';

type ExpressionResultTuple = [GenericModificationOperationNode, unknown];

type ModificationLanguage = {
  modification: ModificationExpressionNode;
  expression: ExpressionResultTuple;
  operation: GenericModificationOperationNode;
  addTagOperation: AddTagOperationNode;
  removeTagOperation: RemoveTagOperationNode;
  softSetValueOperation: SoftSetValueOperationNode;
  hardSetValueOperation: HardSetValueOperationNode;
  addValueOperation: AddValueOperationNode;
  removeValueOperation: RemoveValueOperationNode;
  renameTagOperation: RenameTagOperationNode;
  descriptionUnit:
    | AddDescriptionOperationNode
    | RemoveDescriptionOperationNode
    | null;
  addDescriptionOperation: AddDescriptionOperationNode;
  removeDescriptionOperation: RemoveDescriptionOperationNode;
};

function assertIsModificationOperationNode(
  value: unknown,
): asserts value is GenericModificationOperationNode {
  if (value instanceof ModificationOperationNode) {
    return;
  }

  throw new Error('Expected a ModificationOperationNode');
}

const modificationLanguage = createLanguage<ModificationLanguage>(
  parserDebugger,
  {
    modification: (l) => {
      return P.seq(
        P.alt<GenericModificationOperationNode[]>(
          l.expression.map((result) => {
            const operations: GenericModificationOperationNode[] = [];
            let nextResult: unknown = result;
            do {
              assertIsArray(nextResult);

              const [operation] = nextResult;
              assertIsModificationOperationNode(operation);

              operations.push(operation);
              nextResult = nextResult[1];
            } while (nextResult !== null);

            return operations;
          }),
          ul.ε.map(() => []),
        ),
        P.optWhitespace,
        P.alt<ModificationLanguage['descriptionUnit']>(
          l.descriptionUnit.map((operation) => {
            return operation;
          }),
          ul.ε,
        ),
        P.optWhitespace,
      )
        .map((result) => {
          const operations = result[0];
          const descriptionOperation = result[2];
          if (descriptionOperation !== null) {
            return [...operations, descriptionOperation];
          }

          return operations;
        })
        .map((operations) => {
          return new ModificationExpressionNode(operations);
        });
    },
    expression: (l) => {
      return P.alt<ModificationLanguage['expression']>(
        P.seq(
          // -
          l.operation,
          P.whitespace,
          l.expression,
        ).map((result) => {
          const operation = result[0];
          const nextResult = result[2];
          return [operation, nextResult];
        }),
        l.operation.map((operation) => {
          return [operation, null];
        }),
      );
    },
    operation: (l) => {
      return P.alt<ModificationLanguage['operation']>(
        // -
        l.renameTagOperation,
        l.removeValueOperation,
        l.addValueOperation,
        l.hardSetValueOperation,
        l.softSetValueOperation,
        l.removeTagOperation,
        l.addTagOperation,
      );
    },
    addTagOperation: () => {
      return tl.tagName.map((tagName) => {
        return new AddTagOperationNode(tagName);
      });
    },
    removeTagOperation: () => {
      return P.seq(
        // -
        P.string('-'),
        tl.tagName,
      ).map((result) => {
        const tagName = result[1];
        return new RemoveTagOperationNode(tagName);
      });
    },
    renameTagOperation: () => {
      return P.seq(
        tl.tagName,
        P.optWhitespace,
        P.string('>>'),
        P.optWhitespace,
        tl.tagName,
      ).map((result) => {
        const oldTagName = result[0];
        const newTagName = result[4];
        return new RenameTagOperationNode(oldTagName, newTagName);
      });
    },
    softSetValueOperation: () => {
      return P.seq(
        // -
        tl.tagName,
        tl.delimiter,
        tl.tagValueUnit,
      ).map((result) => {
        const tagName = result[0];
        const tagValues = result[2];
        return new SoftSetValueOperationNode(tagName, tagValues);
      });
    },
    hardSetValueOperation: () => {
      return P.seq(
        // -
        tl.tagName,
        tl.delimiter,
        P.string('='),
        tl.tagValueUnit,
      ).map((result) => {
        const tagName = result[0];
        const tagValues = result[3];
        return new HardSetValueOperationNode(tagName, tagValues);
      });
    },
    addValueOperation: () => {
      return P.seq(
        // -
        tl.tagName,
        tl.delimiter,
        P.string('+'),
        tl.tagValueUnit,
      ).map((result) => {
        const tagName = result[0];
        const tagValues = result[3];
        return new AddValueOperationNode(tagName, tagValues);
      });
    },
    removeValueOperation: () => {
      return P.seq(
        // -
        tl.tagName,
        tl.delimiter,
        P.string('-'),
        tl.tagValueUnit,
      ).map((result) => {
        const tagName = result[0];
        const tagValues = result[3];
        return new RemoveValueOperationNode(tagName, tagValues);
      });
    },
    descriptionUnit: (l) => {
      return P.alt<ModificationLanguage['descriptionUnit']>(
        l.addDescriptionOperation,
        l.removeDescriptionOperation,
        ul.ε,
      );
    },
    addDescriptionOperation: () => {
      return P.seq(
        // -
        P.string('#'),
        P.all,
      ).map((result) => {
        const description = result[1];
        return new AddDescriptionOperationNode(description);
      });
    },
    removeDescriptionOperation: () => {
      return P.seq(
        // -
        P.string('-#'),
        P.all,
      ).map(() => {
        return new RemoveDescriptionOperationNode();
      });
    },
  },
);

export const parseModification = (
  input: string,
): ModificationExpressionNode => {
  return modificationLanguage.modification.tryParse(input);
};
