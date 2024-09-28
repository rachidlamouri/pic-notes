/**
 * @file
 * @note a comment with a single hyphen (// -) forces the formatter to break up
 * the subsequent statements into multiple lines
 */

import P from 'parsimmon';
import { debug } from '../utils/debug';
import { TagNode } from './nodes/tagNode';
import { ExpressionNode } from './nodes/expressionNode';
import { IntersectionNode } from './nodes/intersectionNode';
import { isArray } from '../utils/assertIsArray';
import { ParsedNode } from './nodes/parsedNode';
import { UnionNode } from './nodes/unionNode';
import { DifferenceNode } from './nodes/differenceNode';
import { Constructor } from 'type-fest';
import { GenericOperationNode, OperationNode } from './nodes/operationNode';
import { SelectAllNode } from './nodes/selectAllNode';

const KEBAB = /[0-9a-zA-Z?]+(-[0-9a-zA-Z?]+)*/;

/**
 * Creates a parser that always fails, but calls the given function. Use this in
 * P.alt to log information between alternate parsers
 */
const tap = (fn: (...args: string[]) => void): P.Parser<never> => {
  return P((input, i) => {
    fn(input.charAt(i));
    return P.makeFailure(i, '');
  }) as P.Parser<never>;
};

let indent = 0;
const indentDebug: typeof console.log = (...args) => {
  debug(indent.toString().padStart(2, ' '), ' |'.repeat(indent), ...args);
  if (indent > 30) {
    throw Error('Possibly infinite recursion detected');
  }
};

type ResultType<TParser extends P.Parser<unknown>> =
  TParser extends P.Parser<infer TResult> ? TResult : never;

/**
 * Adds debug logs to a parser. Logs the following:
 *   - 'T' when a parser is tried
 *   - '_' when a parser finishes but has no data
 *   - 'M' when a parser finishes and has a match
 *   - '--' when a parser finishes and fails to match
 */
const withIndentDebug = <TResult>(
  name: string,
  parser: P.Parser<TResult>,
): P.Parser<TResult> => {
  return P.alt<ResultType<typeof parser>>(
    tap(() => {
      indent += 1;
      indentDebug('T', name);
    }),
    parser.map((result) => {
      const letter = result === null ? '_' : 'M';
      indentDebug(letter, name, '"' + result + '"');
      indent -= 1;
      return result;
    }),
    tap(() => {
      indentDebug('--');
      indent -= 1;
    }),
  );
};

enum Operator {
  Intersection = '^',
  Union = '+',
  Difference = '-',
}

type OperationChainEnd = [Operator, ExpressionNode];

type NestedAccumulatedOperation = [Operator, ExpressionNode, unknown];

type AccumulatedOperation = NestedAccumulatedOperation | OperationChainEnd;

const isOperator = (datum: unknown): datum is Operator => {
  return (
    typeof datum === 'string' &&
    (<string[]>Object.values(Operator)).includes(datum)
  );
};

const isNestedAccumulatedOperation = (
  datum: AccumulatedOperation,
): datum is NestedAccumulatedOperation => {
  return datum.length === 3;
};

const isAccumulatedOperation = (
  datum: unknown,
): datum is AccumulatedOperation => {
  return (
    isArray(datum) &&
    (datum.length === 2 || datum.length === 3) &&
    isOperator(datum[0]) &&
    datum[1] instanceof ParsedNode
  );
};

function assertIsAccumulatedOperation(
  datum: unknown,
): asserts datum is AccumulatedOperation {
  if (isAccumulatedOperation(datum)) {
    return;
  }

  throw new Error('Expected an AccumulatedOperation, but received: ' + datum);
}

const operationConstructorByOperator: Record<
  Operator,
  Constructor<GenericOperationNode>
> = {
  [Operator.Intersection]: IntersectionNode,
  [Operator.Union]: UnionNode,
  [Operator.Difference]: DifferenceNode,
};

const associateLeft = ([leftExpression, accumulatedOperation]: [
  ExpressionNode,
  AccumulatedOperation,
]): ExpressionNode => {
  const operator = accumulatedOperation[0];
  const Operation = operationConstructorByOperator[operator];

  const rightExpression: ExpressionNode = accumulatedOperation[1];

  let expression: ExpressionNode;
  if (isNestedAccumulatedOperation(accumulatedOperation)) {
    const nextLeftExpression = new Operation(leftExpression, rightExpression);
    const nextAccumulatedOperation: unknown = accumulatedOperation[2];
    assertIsAccumulatedOperation(nextAccumulatedOperation);

    expression = associateLeft([nextLeftExpression, nextAccumulatedOperation]);
  } else {
    expression = new Operation(leftExpression, rightExpression);
  }

  return expression;
};

type Language = {
  expression: ExpressionNode;
  subexpression1: ExpressionNode;
  subexpression1Prime: AccumulatedOperation | null;
  subexpression2: ExpressionNode;
  subexpression2Prime: AccumulatedOperation | null;
  subexpression3: ExpressionNode;
  subexpression4: SelectAllNode | TagNode;
  unit: SelectAllNode | TagNode;
  selectAll: SelectAllNode;
  taggedValue: TagNode;
  tag: TagNode;
  value: string;
  kebab: string;
  ε: null;
};

const language = P.createLanguage<Language>({
  expression: (l) => {
    return withIndentDebug<Language['expression']>(
      'exp',
      P.seq(
        // -
        P.optWhitespace,
        l.subexpression1,
        P.optWhitespace,
      ).map((result) => {
        const expression = result[1];
        return expression;
      }),
    );
  },
  subexpression1: (l) => {
    return withIndentDebug<Language['subexpression1']>(
      'exp1',
      P.seq(
        // -
        l.subexpression2,
        l.subexpression1Prime,
      ).map((result) => {
        const subexpression2: ExpressionNode = result[0];
        const subexpression1Prime: AccumulatedOperation | null = result[1];

        if (subexpression1Prime === null) {
          return subexpression2;
        }

        const expression = associateLeft([subexpression2, subexpression1Prime]);
        return expression;
      }),
    );
  },
  subexpression1Prime: (l) => {
    return withIndentDebug(
      "exp1'",
      P.alt<Language['subexpression1Prime']>(
        P.seq(
          // -
          P.optWhitespace,
          P.alt(
            // -
            P.string(Operator.Union),
            P.string(Operator.Difference),
          ),
          P.optWhitespace,
          l.subexpression2,
          l.subexpression1Prime,
        ).map((result) => {
          const operator = result[1];
          const subexpression2: ExpressionNode = result[3];
          const subexpression1Prime: AccumulatedOperation | null = result[4];

          if (subexpression1Prime === null) {
            return [operator, subexpression2] satisfies OperationChainEnd;
          }

          return [
            operator,
            subexpression2,
            subexpression1Prime,
          ] satisfies NestedAccumulatedOperation;
        }),
        l.ε,
      ),
    );
  },
  //   return withIndentDebug<Language['subexpression2']>(
  //     'exp2',
  //     P.seq(
  //       // -
  //       l.subexpression3,
  //       l.subexpression2Prime,
  //     ).map((result) => {
  //       const subexpression3 = result[0];
  //       const subexpression2Prime = result[1];

  //       if (subexpression2Prime === null) {
  //         return subexpression3;
  //       }

  //       const associateLeft = ([
  //         leftExpression,
  //         rightData,
  //       ]: RightRecursiveTuple): ExpressionNode => {
  //         if (isRightRecursiveTuple(rightData)) {
  //           const [rightExpressionA, rightExpressionB] = rightData;
  //           const union = new UnionNode(leftExpression, rightExpressionA);
  //           const expression = associateLeft([union, rightExpressionB]);
  //           return expression;
  //         }

  //         if (hasExactlyOne(rightData)) {
  //           const [rightExpression] = rightData;
  //           const expression = new UnionNode(leftExpression, rightExpression);
  //           return expression;
  //         }

  //         throw new Error('Unreachable');
  //       };

  //       const expression = associateLeft([subexpression3, subexpression2Prime]);
  //       return expression;
  //     }),
  //   );
  // },
  // subexpression2Prime: (l) => {
  //   return withIndentDebug(
  //     "exp2'",
  //     P.alt<Language['subexpression2Prime']>(
  //       P.seq(
  //         // -
  //         P.optWhitespace,
  //         P.string('+'),
  //         P.optWhitespace,
  //         l.subexpression3,
  //         l.subexpression2Prime,
  //       ).map((result) => {
  //         const subexpression3 = result[3];
  //         const subexpression2Prime = result[4];

  //         if (subexpression2Prime === null) {
  //           return [subexpression3];
  //         }

  //         return [subexpression3, subexpression2Prime];
  //       }),
  //       l.ε,
  //     ),
  //   );
  // },
  subexpression2: (l) => {
    return withIndentDebug<Language['subexpression2']>(
      'exp3',
      P.seq(
        // -
        l.subexpression3,
        l.subexpression2Prime,
      ).map((result) => {
        const subexpression3: ExpressionNode = result[0];
        const subexpressionPrime: AccumulatedOperation | null = result[1];

        if (subexpressionPrime === null) {
          return subexpression3;
        }

        const expression = associateLeft([subexpression3, subexpressionPrime]);
        return expression;
      }),
    );
  },
  subexpression2Prime: (l) => {
    return withIndentDebug(
      "exp3'",
      P.alt<Language['subexpression2Prime']>(
        P.seq(
          // -
          P.optWhitespace,
          P.string(Operator.Intersection),
          P.optWhitespace,
          l.subexpression3,
          l.subexpression2Prime,
        ).map((result) => {
          const operator = result[1];
          const subexpression3 = result[3];
          const subexpression2Prime = result[4];

          if (subexpression2Prime === null) {
            return [operator, subexpression3] satisfies OperationChainEnd;
          }

          return [
            operator,
            subexpression3,
            subexpression2Prime,
          ] satisfies NestedAccumulatedOperation;
        }),
        l.ε,
      ),
    );
  },
  subexpression3: (l) => {
    return withIndentDebug(
      'exp4',
      P.alt<Language['subexpression3']>(
        // -
        P.seq(
          P.string('('),
          P.optWhitespace,
          l.subexpression1,
          P.optWhitespace,
          P.string(')'),
        ).map((result) => {
          return result[2];
        }),
        l.subexpression4,
      ),
    );
  },
  subexpression4: (l) => {
    return withIndentDebug<Language['subexpression4']>(
      // -
      'exp5',
      l.unit,
    );
  },
  unit: (l) => {
    return withIndentDebug(
      'unt',
      P.alt<Language['unit']>(
        // -
        l.selectAll,
        l.taggedValue,
        l.tag,
      ),
    );
  },
  selectAll: (l) => {
    return withIndentDebug<Language['selectAll']>(
      'all',
      P.string('*').map(() => {
        return new SelectAllNode();
      }),
    );
  },
  taggedValue: (l) => {
    return withIndentDebug<Language['taggedValue']>(
      'tv',
      P.seq(
        // -
        l.tag,
        P.string(':'),
        l.value,
      ).map((result) => {
        const tagName = result[0].tag.name;
        const tagValue = result[2];
        return new TagNode(tagName, tagValue);
      }),
    );
  },
  tag: (l) => {
    return withIndentDebug<Language['tag']>(
      // -
      'tag',
      l.kebab.map((tagName) => {
        return new TagNode(tagName);
      }),
    );
  },
  value: (l) => {
    return withIndentDebug<Language['value']>(
      // -
      'val',
      l.kebab,
    );
  },
  kebab: () => {
    return P.regex(KEBAB);
  },
  ε: () => {
    return P.string('').result(null);
  },
});

export const parse = (input: string) => {
  return language.expression.tryParse(input);
};
