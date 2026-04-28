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
  | 'Text'
  | 'Bold'
  | 'Italic'
  | 'Code'
  | 'Link'
  | 'Image'
  | 'LineBreak'
  | 'Escape';

export interface Position {
  line: number;
  column: number;
}

export interface Node {
  type: NodeType;
  position?: Position;
}

// Block-level nodes
export interface Document extends Node {
  type: 'Document';
  children: Block[];
}

export type Block =
  | Header
  | Paragraph
  | List
  | CodeBlock
  | Blockquote
  | ThematicBreak
  | Table;

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
}

export interface TableRow extends Node {
  type: 'TableRow';
  cells: TableCell[];
}

export interface TableCell extends Node {
  type: 'TableCell';
  align?: 'left' | 'center' | 'right';
  children: Inline[];
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
  | Escape;

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
  return ['Header', 'Paragraph', 'List', 'CodeBlock', 'Blockquote', 'ThematicBreak', 'Table'].includes(node.type);
}

export function isInline(node: Node): node is Inline {
  return ['Text', 'Bold', 'Italic', 'Code', 'Link', 'Image', 'LineBreak', 'Escape'].includes(node.type);
}
