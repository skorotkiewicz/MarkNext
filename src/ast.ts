// AST Node Types for MarkNext

export type NodeType =
  | 'Document'
  | 'Header'
  | 'Paragraph'
  | 'List'
  | 'ListItem'
  | 'CodeBlock'
  | 'Blockquote'
  | 'ThematicBreak'
  | 'Table'
  | 'TableRow'
  | 'TableCell'
  | 'Footnote'
  | 'FootnoteDefinition'
  | 'Math'
  | 'MathBlock'
  | 'Text'
  | 'Bold'
  | 'Italic'
  | 'Code'
  | 'Link'
  | 'Image'
  | 'LineBreak'
  | 'Escape';

// Re-export Position from tokens.ts to avoid duplication
export type { Position } from './tokens';

export interface Node {
  type: NodeType;
  position?: import('./tokens').Position;
}

// Block-level nodes
export interface Document extends Node {
  type: 'Document';
  children: Block[];
  footnotes?: FootnoteDefinition[];
}

export type Block =
  | Header
  | Paragraph
  | List
  | CodeBlock
  | Blockquote
  | ThematicBreak
  | Table
  | FootnoteDefinition
  | MathBlock;

export interface Header extends Node {
  type: 'Header';
  level: 1 | 2 | 3 | 4 | 5 | 6;
  children: Inline[];
}

export interface Paragraph extends Node {
  type: 'Paragraph';
  children: Inline[];
}

export interface List extends Node {
  type: 'List';
  ordered: boolean;
  children: ListItem[];
}

export interface ListItem extends Node {
  type: 'ListItem';
  children: (Block | Inline)[];
}

export interface CodeBlock extends Node {
  type: 'CodeBlock';
  language?: string;
  content: string;
}

export interface Blockquote extends Node {
  type: 'Blockquote';
  children: Block[];
}

export interface ThematicBreak extends Node {
  type: 'ThematicBreak';
}

export interface Table extends Node {
  type: 'Table';
  header: TableRow;
  rows: TableRow[];
  alignments?: ('left' | 'center' | 'right' | null)[];
}

export interface TableRow extends Node {
  type: 'TableRow';
  cells: TableCell[];
  isHeader?: boolean;
}

export interface TableCell extends Node {
  type: 'TableCell';
  align?: 'left' | 'center' | 'right';
  children: Inline[];
}

export interface Footnote extends Node {
  type: 'Footnote';
  id: string;
}

export interface FootnoteDefinition extends Node {
  type: 'FootnoteDefinition';
  id: string;
  children: Block[];
}

export interface Math extends Node {
  type: 'Math';
  content: string;
  display: boolean;
}

export interface MathBlock extends Node {
  type: 'MathBlock';
  content: string;
}

// Inline nodes
export type Inline =
  | Text
  | Bold
  | Italic
  | Code
  | Link
  | Image
  | LineBreak
  | Escape
  | Footnote
  | Math;

export interface Text extends Node {
  type: 'Text';
  value: string;
}

export interface Bold extends Node {
  type: 'Bold';
  children: Inline[];
}

export interface Italic extends Node {
  type: 'Italic';
  children: Inline[];
}

export interface Code extends Node {
  type: 'Code';
  value: string;
}

export interface Link extends Node {
  type: 'Link';
  url: string;
  title?: string;
  children: Inline[];
}

export interface Image extends Node {
  type: 'Image';
  url: string;
  alt: string;
  title?: string;
}

export interface LineBreak extends Node {
  type: 'LineBreak';
}

export interface Escape extends Node {
  type: 'Escape';
  char: string;
}

// AST Traversal helpers
export function isBlock(node: Node): node is Block {
  return ['Header', 'Paragraph', 'List', 'CodeBlock', 'Blockquote', 'ThematicBreak', 'Table', 'FootnoteDefinition', 'MathBlock'].includes(node.type);
}

export function isInline(node: Node): node is Inline {
  return ['Text', 'Bold', 'Italic', 'Code', 'Link', 'Image', 'LineBreak', 'Escape', 'Footnote', 'Math'].includes(node.type);
}
