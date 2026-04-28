import { TokenType } from './tokens';
import type { Token } from './tokens';
import type {
  Node, Document, Block, Header, Paragraph, List, ListItem,
  CodeBlock, Blockquote, ThematicBreak, Table, TableRow, TableCell,
  Inline, Text, Bold, Italic, Code, Link, Image, LineBreak, Escape
} from './ast';

interface ParseError {
  message: string;
  line: number;
  column: number;
}

export class Parser {
  private tokens: Token[];
  private position: number = 0;
  private errors: ParseError[] = [];

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  parse(): Document {
    const blocks: Block[] = [];

    this.skipBlankLines();

    while (!this.isAtEnd()) {
      const block = this.parseBlock();
      if (block) {
        blocks.push(block);
      }
      this.skipBlankLines();
    }

    return {
      type: 'Document',
      children: blocks
    };
  }

  getErrors(): ParseError[] {
    return this.errors;
  }

  private isAtEnd(): boolean {
    return this.peek().type === TokenType.EOF;
  }

  private peek(): Token {
    return this.tokens[this.position] || { type: TokenType.EOF, value: '', position: { line: 0, column: 0, offset: 0 } };
  }

  private peekNext(n: number = 1): Token {
    return this.tokens[this.position + n] || { type: TokenType.EOF, value: '', position: { line: 0, column: 0, offset: 0 } };
  }

  private advance(): Token {
    if (!this.isAtEnd()) this.position++;
    return this.tokens[this.position - 1] || { type: TokenType.EOF, value: '', position: { line: 0, column: 0, offset: 0 } };
  }

  private check(type: TokenType): boolean {
    if (this.isAtEnd()) return false;
    return this.peek().type === type;
  }

  private match(...types: TokenType[]): boolean {
    for (const type of types) {
      if (this.check(type)) {
        this.advance();
        return true;
      }
    }
    return false;
  }

  private skipBlankLines(): void {
    while (this.check(TokenType.NEWLINE)) {
      this.advance();
      // Skip additional whitespace/newlines
      while (this.check(TokenType.SPACE) || this.check(TokenType.NEWLINE)) {
        this.advance();
      }
    }
  }

  private parseBlock(): Block | null {
    const token = this.peek();

    // Thematic break ---
    if (token.type === TokenType.THEMATIC_BREAK) {
      return this.parseThematicBreak();
    }

    // Code block ```
    if (token.type === TokenType.CODE_FENCE) {
      return this.parseCodeBlock();
    }

    // Header #
    if (token.type === TokenType.HASH) {
      return this.parseHeader();
    }

    // Blockquote >
    if (token.type === TokenType.GT) {
      return this.parseBlockquote();
    }

    // List - or 1.
    if (token.type === TokenType.DASH || this.isOrderedListMarker()) {
      return this.parseList();
    }

    // Table | (at start of line with proper structure)
    if (token.type === TokenType.PIPE && this.checkTable()) {
      return this.parseTable();
    }

    // Default: paragraph
    return this.parseParagraph();
  }

  private parseThematicBreak(): ThematicBreak {
    this.advance(); // consume ---
    return { type: 'ThematicBreak' };
  }

  private parseHeader(): Header | Paragraph {
    const hashes = this.advance();
    const level = hashes.value.length as 1 | 2 | 3 | 4 | 5 | 6;

    // Must have space after hashes
    if (!this.check(TokenType.SPACE)) {
      // Not a valid header, treat as paragraph
      this.position--; // backtrack
      return this.parseParagraph();
    }

    this.advance(); // consume space

    const children = this.parseInlineUntilNewline();

    // Optional closing hashes
    this.skipSpaces();
    if (this.check(TokenType.HASH)) {
      this.advance(); // consume closing hashes
    }

    return { type: 'Header', level, children };
  }

  private parseCodeBlock(): CodeBlock {
    this.advance(); // consume ```

    let language: string | undefined;

    // Check for language identifier
    if (this.check(TokenType.TEXT)) {
      language = this.advance().value;
    }

    this.expectNewline();

    // Read code content until closing ```
    let content = '';
    while (!this.isAtEnd() && !this.check(TokenType.CODE_FENCE)) {
      if (this.check(TokenType.NEWLINE)) {
        content += '\n';
        this.advance();
      } else {
        content += this.advance().value;
      }
    }

    // Remove trailing newline if present
    if (content.endsWith('\n')) {
      content = content.slice(0, -1);
    }

    if (this.check(TokenType.CODE_FENCE)) {
      this.advance(); // consume closing ```
    }

    return { type: 'CodeBlock', language, content };
  }

  private parseBlockquote(): Blockquote {
    const blocks: Block[] = [];

    while (this.check(TokenType.GT)) {
      this.advance(); // consume >

      // Optional space after >
      if (this.check(TokenType.SPACE)) {
        this.advance();
      }

      // Parse the block content
      if (!this.check(TokenType.NEWLINE)) {
        const block = this.parseBlock();
        if (block) {
          blocks.push(block);
        }
      }

      // Check for continuation
      if (this.check(TokenType.NEWLINE)) {
        this.advance();
        if (!this.check(TokenType.GT)) {
          break;
        }
      }
    }

    return { type: 'Blockquote', children: blocks };
  }

  private parseList(): List {
    const items: ListItem[] = [];
    const ordered = this.isOrderedListMarker();

    while (true) {
      const item = this.parseListItem(ordered);
      if (item) {
        items.push(item);
      }

      // Check for next item
      if (ordered && this.isOrderedListMarker()) {
        continue;
      } else if (!ordered && this.check(TokenType.DASH)) {
        continue;
      } else {
        break;
      }
    }

    return { type: 'List', ordered, children: items };
  }

  private parseListItem(ordered: boolean): ListItem | null {
    // Consume marker
    if (ordered) {
      this.advance(); // number
      this.advance(); // .
    } else {
      this.advance(); // -
    }

    // Must have space after marker
    if (!this.check(TokenType.SPACE)) {
      return null;
    }
    this.advance();

    const children: (Block | Inline)[] = [];

    // Parse content until next list item or end
    while (!this.isAtEnd() && !this.check(TokenType.NEWLINE)) {
      const inline = this.parseInline();
      if (inline) {
        children.push(inline);
      }
    }

    // Handle continuation lines (indented content)
    if (this.check(TokenType.NEWLINE)) {
      this.advance();

      // Check for nested list or continuation
      while (this.check(TokenType.SPACE) && this.checkNextIndent()) {
        // Continuation of this item
        this.advance(); this.advance(); // consume indent

        if (this.check(TokenType.NEWLINE)) {
          this.advance();
          continue;
        }

        // More content
        while (!this.isAtEnd() && !this.check(TokenType.NEWLINE)) {
          const inline = this.parseInline();
          if (inline) children.push(inline);
        }

        if (this.check(TokenType.NEWLINE)) {
          this.advance();
        }
      }
    }

    return { type: 'ListItem', children };
  }

  private parseParagraph(): Paragraph {
    const children: Inline[] = [];

    while (!this.isAtEnd() && !this.check(TokenType.NEWLINE)) {
      const inline = this.parseInline();
      if (inline) {
        children.push(inline);
      }
    }

    // Consume newline if present
    if (this.check(TokenType.NEWLINE)) {
      this.advance();
    }

    // Continue paragraph if next line isn't a block element
    while (!this.isAtEnd() && !this.isBlockStart()) {
      // Add space between lines if needed
      if (children.length > 0) {
        const last = children[children.length - 1]!;
        if (last.type === 'Text' && !(last as Text).value.endsWith(' ')) {
          (last as Text).value += ' ';
        }
      }

      while (!this.isAtEnd() && !this.check(TokenType.NEWLINE)) {
        const inline = this.parseInline();
        if (inline) children.push(inline);
      }

      if (this.check(TokenType.NEWLINE)) {
        this.advance();
      }
    }

    return { type: 'Paragraph', children };
  }

  private parseInline(): Inline | null {
    const token = this.peek();

    // Bold: *text*
    if (token.type === TokenType.STAR) {
      return this.parseBold();
    }

    // Italic: /text/
    if (token.type === TokenType.SLASH) {
      return this.parseItalic();
    }

    // Code: `text`
    if (token.type === TokenType.BACKTICK) {
      return this.parseCode();
    }

    // Image: ![alt](url)
    if (token.type === TokenType.EXCLAIM && this.peekNext(1).type === TokenType.LBRACKET) {
      return this.parseImage();
    }

    // Link: [text](url)
    if (token.type === TokenType.LBRACKET) {
      return this.parseLink();
    }

    // Backslash: either escape or line break
    if (token.type === TokenType.BACKSLASH) {
      if (this.peekNext(1).type === TokenType.NEWLINE) {
        // Line break: \ followed by newline
        this.advance(); // consume \
        this.advance(); // consume newline
        return { type: 'LineBreak' };
      }
      // Otherwise it's an escape
      return this.parseEscape();
    }

    // Text content (including < and > which are text in most contexts)
    if (token.type === TokenType.TEXT ||
        token.type === TokenType.SPACE ||
        token.type === TokenType.LT ||
        token.type === TokenType.GT ||
        token.type === TokenType.GT_SYMBOL) {
      let value = '';

      // Concatenate consecutive text-like tokens
      while (this.check(TokenType.TEXT) ||
             this.check(TokenType.SPACE) ||
             this.check(TokenType.LT) ||
             this.check(TokenType.GT) ||
             this.check(TokenType.GT_SYMBOL)) {
        value += this.advance().value;
      }

      if (value.length > 0) {
        return { type: 'Text', value };
      }
    }

    // Skip unknown tokens but include them as text
    if (!this.isAtEnd()) {
      const t = this.advance();
      return { type: 'Text', value: t.value };
    }
    return null;
  }

  private parseBold(): Bold | Text {
    this.advance(); // consume *

    const children: Inline[] = [];
    while (!this.isAtEnd() && !this.check(TokenType.STAR)) {
      const inline = this.parseInline();
      if (inline) children.push(inline);
    }

    if (this.check(TokenType.STAR)) {
      this.advance(); // consume closing *
      return { type: 'Bold', children };
    }

    // Unclosed bold - treat as text
    return { type: 'Text', value: '*' + children.map(c => this.inlineToText(c)).join('') };
  }

  private parseItalic(): Italic | Text {
    this.advance(); // consume /

    const children: Inline[] = [];
    while (!this.isAtEnd() && !this.check(TokenType.SLASH)) {
      const inline = this.parseInline();
      if (inline) children.push(inline);
    }

    if (this.check(TokenType.SLASH)) {
      this.advance(); // consume closing /
      return { type: 'Italic', children };
    }

    // Unclosed italic - treat as text
    return { type: 'Text', value: '/' + children.map(c => this.inlineToText(c)).join('') };
  }

  private parseCode(): Code {
    this.advance(); // consume `

    let value = '';
    while (!this.isAtEnd() && !this.check(TokenType.BACKTICK) && !this.check(TokenType.NEWLINE)) {
      value += this.advance().value;
    }

    if (this.check(TokenType.BACKTICK)) {
      this.advance(); // consume closing `
    }

    return { type: 'Code', value };
  }

  private parseLink(): Link | Text {
    this.advance(); // consume [

    // Parse link text
    const textChildren: Inline[] = [];
    while (!this.isAtEnd() && !this.check(TokenType.RBRACKET)) {
      const inline = this.parseInline();
      if (inline) textChildren.push(inline);
    }

    if (!this.check(TokenType.RBRACKET)) {
      return { type: 'Text', value: '[' + textChildren.map(c => this.inlineToText(c)).join('') };
    }
    this.advance(); // consume ]

    if (!this.check(TokenType.LPAREN)) {
      return { type: 'Text', value: '[' + textChildren.map(c => this.inlineToText(c)).join('') + ']' };
    }
    this.advance(); // consume (

    // Parse URL
    let url = '';
    let title: string | undefined;

    // Handle <url> format
    if (this.check(TokenType.LT)) {
      this.advance();
      while (!this.isAtEnd() && !this.check(TokenType.GT_SYMBOL) && !this.check(TokenType.GT)) {
        url += this.advance().value;
      }
      if (this.check(TokenType.GT_SYMBOL) || this.check(TokenType.GT)) {
        this.advance();
      }
    } else {
      // Plain URL
      while (!this.isAtEnd() && !this.check(TokenType.RPAREN) && !this.check(TokenType.SPACE) && !this.check(TokenType.DQUOTE)) {
        url += this.advance().value;
      }
    }

    // Parse optional title: "title"
    if (this.check(TokenType.SPACE)) {
      this.advance();
      if (this.check(TokenType.DQUOTE)) {
        this.advance();
        title = '';
        while (!this.isAtEnd() && !this.check(TokenType.DQUOTE)) {
          title += this.advance().value;
        }
        if (this.check(TokenType.DQUOTE)) {
          this.advance();
        }
      }
    }

    if (this.check(TokenType.RPAREN)) {
      this.advance();
    }

    return { type: 'Link', url, title, children: textChildren };
  }

  private parseImage(): Image | Text {
    this.advance(); // consume !
    this.advance(); // consume [

    // Parse alt text
    let alt = '';
    while (!this.isAtEnd() && !this.check(TokenType.RBRACKET)) {
      alt += this.advance().value;
    }

    if (!this.check(TokenType.RBRACKET)) {
      return { type: 'Text', value: '![' + alt };
    }
    this.advance(); // consume ]

    if (!this.check(TokenType.LPAREN)) {
      return { type: 'Text', value: '![' + alt + ']' };
    }
    this.advance(); // consume (

    // Parse URL
    let url = '';
    let title: string | undefined;

    if (this.check(TokenType.LT)) {
      this.advance();
      while (!this.isAtEnd() && !this.check(TokenType.GT_SYMBOL) && !this.check(TokenType.GT)) {
        url += this.advance().value;
      }
      if (this.check(TokenType.GT_SYMBOL) || this.check(TokenType.GT)) {
        this.advance();
      }
    } else {
      while (!this.isAtEnd() && !this.check(TokenType.RPAREN) && !this.check(TokenType.SPACE) && !this.check(TokenType.DQUOTE)) {
        url += this.advance().value;
      }
    }

    // Parse optional title
    if (this.check(TokenType.SPACE)) {
      this.advance();
      if (this.check(TokenType.DQUOTE)) {
        this.advance();
        title = '';
        while (!this.isAtEnd() && !this.check(TokenType.DQUOTE)) {
          title += this.advance().value;
        }
        if (this.check(TokenType.DQUOTE)) {
          this.advance();
        }
      }
    }

    if (this.check(TokenType.RPAREN)) {
      this.advance();
    }

    return { type: 'Image', url, alt, title };
  }

  private parseEscape(): Escape | Text {
    this.advance(); // consume \

    if (this.isAtEnd()) {
      return { type: 'Text', value: '\\' };
    }

    const char = this.advance().value;
    return { type: 'Escape', char };
  }

  private parseTable(): Table {
    // Simple table parsing - can be expanded
    const rows: TableRow[] = [];

    // Header row
    rows.push(this.parseTableRow());

    // Separator row (skip)
    if (this.check(TokenType.PIPE)) {
      while (!this.isAtEnd() && !this.check(TokenType.NEWLINE)) {
        this.advance();
      }
      if (this.check(TokenType.NEWLINE)) {
        this.advance();
      }
    }

    // Data rows
    while (this.check(TokenType.PIPE)) {
      rows.push(this.parseTableRow());
    }

    return {
      type: 'Table',
      header: rows[0] || { type: 'TableRow', cells: [] },
      rows: rows.slice(1)
    };
  }

  private parseTableRow(): TableRow {
    const cells: TableCell[] = [];

    this.advance(); // consume |

    while (!this.isAtEnd() && !this.check(TokenType.NEWLINE)) {
      // Skip leading space
      if (this.check(TokenType.SPACE)) {
        this.advance();
      }

      // Parse cell content
      const content: Inline[] = [];
      while (!this.isAtEnd() && !this.check(TokenType.PIPE) && !this.check(TokenType.NEWLINE)) {
        const inline = this.parseInline();
        if (inline) content.push(inline);
      }

      cells.push({ type: 'TableCell', children: content });

      if (this.check(TokenType.PIPE)) {
        this.advance();
      }
    }

    if (this.check(TokenType.NEWLINE)) {
      this.advance();
    }

    return { type: 'TableRow', cells };
  }

  private parseInlineUntilNewline(): Inline[] {
    const children: Inline[] = [];
    while (!this.isAtEnd() && !this.check(TokenType.NEWLINE)) {
      const inline = this.parseInline();
      if (inline) children.push(inline);
    }
    if (this.check(TokenType.NEWLINE)) {
      this.advance();
    }
    return children;
  }

  private isOrderedListMarker(): boolean {
    const t1 = this.peek();
    const t2 = this.peekNext(1);
    return t1.type === TokenType.TEXT && /^\d+$/.test(t1.value) && t2.type === TokenType.PERIOD;
  }

  private isBlockStart(): boolean {
    const t = this.peek();
    return [
      TokenType.HASH,        // Header
      TokenType.DASH,        // List or hr
      TokenType.GT,          // Blockquote
      TokenType.CODE_FENCE,  // Code block
      TokenType.THEMATIC_BREAK,
      TokenType.PIPE         // Table
    ].includes(t.type) || this.isOrderedListMarker();
  }

  private checkTable(): boolean {
    // Check if this looks like a table header row
    // Must have | at start and structure like | a | b |
    if (!this.check(TokenType.PIPE)) return false;

    // Look ahead for separator row pattern
    let pos = this.position;
    let foundPipe = false;

    // Skip current line
    while (pos < this.tokens.length && this.tokens[pos]!.type !== TokenType.NEWLINE) {
      if (this.tokens[pos]!.type === TokenType.PIPE) foundPipe = true;
      pos++;
    }

    if (!foundPipe) return false;

    // Check next line for separator |---|---|
    pos++; // skip newline
    if (pos >= this.tokens.length) return false;

    if (this.tokens[pos]!.type !== TokenType.PIPE) return false;

    // Look for dashes in next line
    while (pos < this.tokens.length && this.tokens[pos]!.type !== TokenType.NEWLINE) {
      if (this.tokens[pos]!.type === TokenType.DASH) return true;
      pos++;
    }

    return false;
  }

  private checkNextIndent(): boolean {
    const t1 = this.peekNext(1);
    const t2 = this.peekNext(2);
    return t1.type === TokenType.SPACE && t2.type === TokenType.SPACE;
  }

  private skipSpaces(): void {
    while (this.check(TokenType.SPACE)) {
      this.advance();
    }
  }

  private expectNewline(): void {
    if (this.check(TokenType.NEWLINE)) {
      this.advance();
    }
  }

  private inlineToText(inline: Inline): string {
    switch (inline.type) {
      case 'Text': return (inline as Text).value;
      case 'Code': return (inline as Code).value;
      case 'Bold': return '*' + (inline as Bold).children.map(c => this.inlineToText(c)).join('') + '*';
      case 'Italic': return '/' + (inline as Italic).children.map(c => this.inlineToText(c)).join('') + '/';
      case 'Link': return '[' + (inline as Link).children.map(c => this.inlineToText(c)).join('') + '](' + (inline as Link).url + ')';
      case 'Image': return '![' + (inline as Image).alt + '](' + (inline as Image).url + ')';
      case 'Escape': return '\\' + (inline as Escape).char;
      case 'LineBreak': return '\n';
      default: return '';
    }
  }
}

export function parse(tokens: Token[]): Document {
  const parser = new Parser(tokens);
  return parser.parse();
}
