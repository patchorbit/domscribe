import type {
  Node as AcornNode,
  Expression,
  SourceLocation as AcornSourceLocation,
} from 'acorn';

/**
 * All JSX-specific nodes extend Acorn's base Node.
 * start/end are numeric indices; loc is present when locations:true.
 */
export interface AcornJSXNode extends AcornNode {
  type: string;
  start: number;
  end: number;
  loc?: AcornSourceLocation;
}

/**
 * Identifiers and names
 */
export interface AcornJSXIdentifier extends AcornJSXNode {
  type: 'JSXIdentifier';
  name: string;
}

export interface AcornJSXNamespacedName extends AcornJSXNode {
  type: 'JSXNamespacedName';
  namespace: AcornJSXIdentifier;
  name: AcornJSXIdentifier;
}

export interface AcornJSXMemberExpression extends AcornJSXNode {
  type: 'JSXMemberExpression';
  object: AcornJSXIdentifier | AcornJSXMemberExpression;
  property: AcornJSXIdentifier;
}

/**
 * Literals inside JSX attributes may be emitted as standard Literal nodes by acorn.
 * We model the value we care about here for convenience.
 */
export interface AcornJSXText extends AcornJSXNode {
  type: 'JSXText';
  value: string;
  raw?: string;
}

/**
 * Expressions inside JSX must be wrapped.
 */
export interface AcornJSXEmptyExpression extends AcornJSXNode {
  type: 'JSXEmptyExpression';
}

export interface AcornJSXExpressionContainer extends AcornJSXNode {
  type: 'JSXExpressionContainer';
  expression: Expression | AcornJSXEmptyExpression;
}

/**
 * Attributes
 */
export interface AcornJSXAttribute extends AcornJSXNode {
  type: 'JSXAttribute';
  name: AcornJSXIdentifier | AcornJSXNamespacedName;
  // value: "..." (string Literal), {...expr} (wrapped), or null for boolean attrs (<Tag disabled>)
  value: AcornJSXAttributeValue | null;
}

export interface AcornJSXSpreadAttribute extends AcornJSXNode {
  type: 'JSXSpreadAttribute';
  argument: Expression;
}

/**
 * Opening/Closing Elements
 */
export type AcornJSXName =
  | AcornJSXIdentifier
  | AcornJSXMemberExpression
  | AcornJSXNamespacedName;

export interface AcornJSXOpeningElement extends AcornJSXNode {
  type: 'JSXOpeningElement';
  name: AcornJSXName;
  attributes: Array<AcornJSXAttribute | AcornJSXSpreadAttribute>;
  selfClosing: boolean;
}

export interface AcornJSXClosingElement extends AcornJSXNode {
  type: 'JSXClosingElement';
  name: AcornJSXName;
}

/**
 * Elements and Fragments
 */
export type AcornJSXChild =
  | AcornJSXText
  | AcornJSXExpressionContainer
  | AcornJSXElement
  | AcornJSXFragment;

export interface AcornJSXElement extends AcornJSXNode {
  type: 'JSXElement';
  openingElement: AcornJSXOpeningElement;
  closingElement: AcornJSXClosingElement | null;
  children: AcornJSXChild[];
}

export interface AcornJSXOpeningFragment extends AcornJSXNode {
  type: 'JSXOpeningFragment';
}

export interface AcornJSXClosingFragment extends AcornJSXNode {
  type: 'JSXClosingFragment';
}

export interface AcornJSXFragment extends AcornJSXNode {
  type: 'JSXFragment';
  openingFragment: AcornJSXOpeningFragment;
  closingFragment: AcornJSXClosingFragment;
  children: AcornJSXChild[];
}

/**
 * Helpful unions
 */
export type AcornJSXAttributeValue =
  | AcornJSXExpressionContainer
  | StringLiteralLike;

/**
 * String literal subset used by acorn for attribute values like className="x".
 * Acorn’s Literal has many forms; we only need the string case for JSX attrs.
 */
export interface StringLiteralLike extends AcornJSXNode {
  type: 'Literal';
  value: string;
  raw?: string;
}

export type AcornJSXOpeningElementNode =
  | AcornJSXOpeningElement
  | AcornJSXOpeningFragment;
