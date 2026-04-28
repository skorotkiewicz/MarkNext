// Token types for MarkNext
// Based on the formal EBNF grammar

export enum TokenType {
  // End of file
  EOF = 'EOF',

  // Whitespace
  NEWLINE = 'NEWLINE',
  SPACE = 'SPACE',

  // Structure
  HASH = 'HASH',           // #
  DASH = 'DASH',           // -
  PIPE = 'PIPE',           // |
  GT = 'GT',               // >

  // Emphasis
  STAR = 'STAR',           // *
  SLASH = 'SLASH',         // /

  // Code
  BACKTICK = 'BACKTICK',   // `

  // Links
  LBRACKET = 'LBRACKET',   // [
  RBRACKET = 'RBRACKET',   // ]
  LPAREN = 'LPAREN',       // (
  RPAREN = 'RPAREN',       // )
  EXCLAIM = 'EXCLAIM',     // !

  // Misc
  BACKSLASH = 'BACKSLASH', // \
  PERIOD = 'PERIOD',       // .
  LT = 'LT',               // <
  GT_SYMBOL = 'GT_SYMBOL', // > (for URLs)
  UNDERSCORE = 'UNDERSCORE', // _
  COLON = 'COLON',         // :
  EQUALS = 'EQUALS',       // =
  DQUOTE = 'DQUOTE',       // "
  CARET = 'CARET',         // ^
  DOLLAR = 'DOLLAR',       // $

  // Content
  TEXT = 'TEXT',           // Any text content
  CODE_TEXT = 'CODE_TEXT', // Content inside code blocks

  // Special sequences
  CODE_FENCE = 'CODE_FENCE',      // ```
  THEMATIC_BREAK = 'THEMATIC_BREAK', // ---
}

export interface Token {
  type: TokenType;
  value: string;
  position: Position;
}

export interface Position {
  line: number;
  column: number;
  offset: number;
}

export interface TokenWithLiteral extends Token {
  literal: string;
}

// Special token sequences detection
export function isCodeFence(value: string): boolean {
  return value === '```';
}

export function isThematicBreak(value: string): boolean {
  return /^-{3,}$/.test(value);
}

export function isHeaderPrefix(value: string): boolean {
  return /^#{1,6}$/.test(value);
}
