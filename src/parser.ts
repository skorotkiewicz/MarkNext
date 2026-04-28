import { TokenType } from './tokens';
import type { Token } from './tokens';
import type {
  Node, Document, Block, Header, Paragraph, List, ListItem,
  CodeBlock, Blockquote, ThematicBreak, Table, TableRow, TableCell,
  Inline, Text, Bold, Italic, Code, Link, Image, LineBreak, Escape,
  Footnote, FootnoteDefinition, Math, MathBlock, Shortcode
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
    while (true) {
      if (this.check(TokenType.NEWLINE)) {
        this.advance();
        continue;
      }
      if (this.check(TokenType.SPACE)) {
        const saved = this.position;
        this.advance();
        if (this.check(TokenType.NEWLINE)) {
          this.advance();
          continue;
        }
        if (this.check(TokenType.SPACE)) {
          continue;
        }
        this.position = saved;
        break;
      }
      break;
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

    // Math block $$ (at start of line, needs to be on its own line)
    if (token.type === TokenType.DOLLAR && this.peekNext(1).type === TokenType.DOLLAR) {
      return this.parseMathBlock();
    }

    // Footnote definition [^id]:
    if (token.type === TokenType.LBRACKET &&
        this.peekNext(1).type === TokenType.CARET) {
      return this.parseFootnoteDefinition();
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

    // Check for language identifier (EBNF: language = letter, { letter | digit | dash | underscore })
    if (this.check(TokenType.TEXT)) {
      language = this.advance().value;
      while (this.check(TokenType.DASH) || this.check(TokenType.UNDERSCORE) || this.check(TokenType.TEXT)) {
        language += this.advance().value;
      }
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
    return this.parseListAtIndent(0);
  }

  private parseListAtIndent(indentLevel: number): List {
    const items: ListItem[] = [];

    // Consume indent spaces if we're in a sublist
    if (indentLevel > 0) {
      this.consumeSpaces(indentLevel);
    }

    const ordered = this.isOrderedListMarker();

    // Parse first item
    const firstItem = this.parseListItem(ordered);
    if (firstItem) {
      items.push(firstItem);
    }

    while (true) {
      if (this.check(TokenType.NEWLINE)) {
        this.advance();
      }

      // Check for indented sublist (deeper than current level)
      const subIndent = this.countIndent();
      if (subIndent > indentLevel && this.isIndentedListMarkerAfter(subIndent)) {
        const subList = this.parseListAtIndent(subIndent);
        if (items.length > 0) {
          items[items.length - 1]!.children.push(subList);
        }
        // After sublist, re-check for more items without consuming another item
        continue;
      }

      // Check for next item at current indent level
      if (indentLevel > 0) {
        const nextIndent = this.countIndent();
        if (nextIndent === indentLevel && this.isIndentedListMarkerAfter(nextIndent)) {
          this.consumeSpaces(indentLevel);
          const item = this.parseListItem(ordered);
          if (item) items.push(item);
          continue;
        }
        break;
      }

      // Top-level: check for next item
      if (ordered && this.isOrderedListMarker()) {
        const item = this.parseListItem(ordered);
        if (item) items.push(item);
        continue;
      } else if (!ordered && this.check(TokenType.DASH)) {
        const item = this.parseListItem(ordered);
        if (item) items.push(item);
        continue;
      } else {
        break;
      }
    }

    return { type: 'List', ordered, children: items };
  }

  private countIndent(): number {
    let count = 0;
    while (this.position + count < this.tokens.length && this.tokens[this.position + count]!.type === TokenType.SPACE) {
      count++;
    }
    return count;
  }

  private isIndentedListMarkerAfter(indent: number): boolean {
    const markerIdx = this.position + indent;
    if (markerIdx >= this.tokens.length) return false;
    const marker = this.tokens[markerIdx]!;
    if (marker.type === TokenType.DASH) return true;
    if (marker.type === TokenType.TEXT && /^\d+$/.test(marker.value)) {
      const afterIdx = markerIdx + 1;
      return afterIdx < this.tokens.length && this.tokens[afterIdx]!.type === TokenType.PERIOD;
    }
    return false;
  }

  private consumeSpaces(count: number): void {
    for (let i = 0; i < count && this.check(TokenType.SPACE); i++) {
      this.advance();
    }
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

    // Parse content until newline
    while (!this.isAtEnd() && !this.check(TokenType.NEWLINE)) {
      const inline = this.parseInline();
      if (inline) {
        children.push(inline);
      }
    }

    // Handle continuation lines (indented inline content only, not sublists)
    if (this.check(TokenType.NEWLINE)) {
      this.advance();

      while (this.check(TokenType.SPACE)) {
        const indent = this.countIndent();
        if (indent < 2) break;
        if (this.isIndentedListMarkerAfter(indent)) break;

        // Consume the indent spaces
        for (let i = 0; i < indent; i++) this.advance();

        if (this.check(TokenType.NEWLINE)) {
          this.advance();
          continue;
        }

        // Inline continuation content
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

    // Continue paragraph if next line isn't a block element or blank line
    while (!this.isAtEnd() && !this.isBlockStart() && !this.isBlankLine()) {
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

    // Footnote: [^id] - check before link since link is more generic
    if (token.type === TokenType.LBRACKET && this.peekNext(1).type === TokenType.CARET) {
      return this.parseFootnote();
    }

    // Shortcode: [name param="value"] (EBNF lines 192-199, spec section 5.2)
    if (this.isShortcode()) {
      return this.parseShortcode();
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

    // Math inline: $...$ or $$...$$
    if (token.type === TokenType.DOLLAR) {
      return this.parseMath();
    }

    // Auto-link: <url> (EBNF: auto_link = lt, link_url, gt; spec section 4.5)
    if (token.type === TokenType.LT && this.isAutoLink()) {
      return this.parseAutoLink();
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
    while (!this.isAtEnd() && !this.check(TokenType.STAR) && !this.check(TokenType.PIPE) && !this.check(TokenType.NEWLINE)) {
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
    while (!this.isAtEnd() && !this.check(TokenType.SLASH) && !this.check(TokenType.PIPE) && !this.check(TokenType.NEWLINE)) {
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

    // Handle <url> format (EBNF: angle_url = lt, link_url, gt)
    if (this.check(TokenType.LT)) {
      this.advance();
      while (!this.isAtEnd() && !this.check(TokenType.GT_SYMBOL)) {
        url += this.advance().value;
      }
      if (this.check(TokenType.GT_SYMBOL)) {
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
      while (!this.isAtEnd() && !this.check(TokenType.GT_SYMBOL)) {
        url += this.advance().value;
      }
      if (this.check(TokenType.GT_SYMBOL)) {
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

  private static readonly ESCAPABLE_CHARS = new Set([
    '\\', '*', '/', '`', '[', ']', '(', ')', '!', '#', '-', '>', '|', '<', '"', ':', '=', '^', '$'
  ]);

  private parseEscape(): Escape | Text {
    this.advance(); // consume \

    if (this.isAtEnd()) {
      return { type: 'Text', value: '\\' };
    }

    const token = this.advance();
    const firstChar = token.value[0]!;
    const rest = token.value.slice(1);

    if (Parser.ESCAPABLE_CHARS.has(firstChar)) {
      if (rest.length > 0) {
        this.position--;
        (this.tokens[this.position] as { value: string }).value = rest;
      }
      return { type: 'Escape', char: firstChar };
    }

    if (rest.length > 0) {
      this.position--;
      (this.tokens[this.position] as { value: string }).value = rest;
    }
    return { type: 'Text', value: '\\' + firstChar };
  }

  private parseFootnote(): Footnote | Text {
    this.advance(); // consume [
    this.advance(); // consume ^

    let id = '';
    while (!this.isAtEnd() && !this.check(TokenType.RBRACKET) && !this.check(TokenType.NEWLINE)) {
      id += this.advance().value;
    }

    if (!this.check(TokenType.RBRACKET)) {
      return { type: 'Text', value: '[^' + id };
    }
    this.advance(); // consume ]

    return { type: 'Footnote', id: id.trim() };
  }

  private isShortcode(): boolean {
    if (!this.check(TokenType.LBRACKET)) return false;

    const name = this.peekNext(1);
    if (name.type !== TokenType.TEXT) return false;
    if (!/^[a-zA-Z][a-zA-Z0-9-]*$/.test(name.value)) return false;

    const afterName = this.peekNext(2);

    if (afterName.type === TokenType.RBRACKET) {
      return this.peekNext(3).type !== TokenType.LPAREN;
    }

    if (afterName.type === TokenType.SPACE) {
      let i = 3;
      while (i < 30) {
        const tok = this.peekNext(i);
        if (tok.type === TokenType.RBRACKET || tok.type === TokenType.NEWLINE || tok.type === TokenType.EOF) break;
        if (tok.type === TokenType.EQUALS) return true;
        i++;
      }
    }

    return false;
  }

  private parseShortcode(): Shortcode {
    this.advance(); // consume [

    const name = this.advance().value;
    const params: Record<string, string> = {};

    while (!this.isAtEnd() && !this.check(TokenType.RBRACKET) && !this.check(TokenType.NEWLINE)) {
      if (this.check(TokenType.SPACE)) {
        this.advance();
        continue;
      }

      let paramName = '';
      while (!this.isAtEnd() && !this.check(TokenType.EQUALS) && !this.check(TokenType.RBRACKET) && !this.check(TokenType.SPACE) && !this.check(TokenType.NEWLINE)) {
        paramName += this.advance().value;
      }

      if (this.check(TokenType.EQUALS)) {
        this.advance();

        let paramValue = '';
        if (this.check(TokenType.DQUOTE)) {
          this.advance();
          while (!this.isAtEnd() && !this.check(TokenType.DQUOTE)) {
            paramValue += this.advance().value;
          }
          if (this.check(TokenType.DQUOTE)) {
            this.advance();
          }
        } else {
          while (!this.isAtEnd() && !this.check(TokenType.SPACE) && !this.check(TokenType.RBRACKET) && !this.check(TokenType.NEWLINE)) {
            paramValue += this.advance().value;
          }
        }

        if (paramName) {
          params[paramName] = paramValue;
        }
      } else if (paramName) {
        params[paramName] = '';
      }
    }

    if (this.check(TokenType.RBRACKET)) {
      this.advance();
    }

    return { type: 'Shortcode', name, params };
  }

  private parseMath(): Math | Text {
    this.advance(); // consume first $

    let display = false;
    if (this.check(TokenType.DOLLAR)) {
      this.advance(); // consume second $ for $$
      display = true;
    }

    let content = '';

    while (!this.isAtEnd()) {
      if (this.check(TokenType.DOLLAR)) {
        if (display) {
          // Check for $$
          if (this.peekNext(1).type === TokenType.DOLLAR) {
            this.advance(); this.advance(); // consume $$
            return { type: 'Math', content: content.trim(), display };
          }
        } else {
          // Single $
          this.advance(); // consume $
          return { type: 'Math', content: content.trim(), display };
        }
      }
      content += this.advance().value;
    }

    // Unclosed math - treat as text
    const prefix = display ? '$$' : '$';
    return { type: 'Text', value: prefix + content };
  }

  private isAutoLink(): boolean {
    if (this.peek().type !== TokenType.LT) return false;

    let i = 1;
    let content = '';
    while (i < 30) {
      const tok = this.peekNext(i);
      if (tok.type === TokenType.GT_SYMBOL) {
        break;
      }
      if (tok.type === TokenType.NEWLINE || tok.type === TokenType.EOF) {
        return false;
      }
      content += tok.value;
      i++;
    }

    if (!content) return false;

    return /^(https?:\/\/|ftp:\/\/|mailto:)/.test(content);
  }

  private parseAutoLink(): Link {
    this.advance(); // consume <

    let url = '';
    while (!this.isAtEnd() && !this.check(TokenType.GT_SYMBOL) && !this.check(TokenType.NEWLINE)) {
      url += this.advance().value;
    }

    if (this.check(TokenType.GT_SYMBOL)) {
      this.advance(); // consume >
    }

    return {
      type: 'Link',
      url,
      children: [{ type: 'Text', value: url }]
    };
  }

  private parseMathBlock(): MathBlock | Paragraph {
    this.advance(); this.advance(); // consume $$

    let content = '';
    while (!this.isAtEnd()) {
      if (this.check(TokenType.DOLLAR) && this.peekNext(1).type === TokenType.DOLLAR) {
        this.advance(); this.advance(); // consume $$
        return { type: 'MathBlock', content: content.trim() };
      }
      if (this.check(TokenType.NEWLINE)) {
        content += '\n';
        this.advance();
      } else {
        content += this.advance().value;
      }
    }

    // Unclosed math block - treat as paragraph with literal $$ text
    return {
      type: 'Paragraph',
      children: [{ type: 'Text', value: '$$' + content }]
    };
  }

  private parseFootnoteDefinition(): FootnoteDefinition | null {
    this.advance(); // consume [
    this.advance(); // consume ^

    let id = '';
    while (!this.isAtEnd() && !this.check(TokenType.RBRACKET) && !this.check(TokenType.NEWLINE)) {
      id += this.advance().value;
    }

    if (!this.check(TokenType.RBRACKET)) {
      // Not a valid footnote def, backtrack and let paragraph handle it
      return null;
    }
    this.advance(); // consume ]

    if (!this.check(TokenType.COLON)) {
      return null;
    }
    this.advance(); // consume :

    if (this.check(TokenType.SPACE)) {
      this.advance();
    }

    // Parse footnote content (rest of the line + continuation)
    const children: Block[] = [];
    const paraChildren: Inline[] = [];

    // First line content
    while (!this.isAtEnd() && !this.check(TokenType.NEWLINE)) {
      const inline = this.parseInline();
      if (inline) paraChildren.push(inline);
    }

    if (paraChildren.length > 0) {
      children.push({ type: 'Paragraph', children: paraChildren });
    }

    // Consume newline
    if (this.check(TokenType.NEWLINE)) {
      this.advance();
    }

    // Check for indented continuation lines
    while (this.check(TokenType.SPACE) && this.peekNext(1).type === TokenType.SPACE) {
      this.advance(); this.advance(); // consume indent

      const contChildren: Inline[] = [];
      while (!this.isAtEnd() && !this.check(TokenType.NEWLINE)) {
        const inline = this.parseInline();
        if (inline) contChildren.push(inline);
      }

      if (contChildren.length > 0) {
        children.push({ type: 'Paragraph', children: contChildren });
      }

      if (this.check(TokenType.NEWLINE)) {
        this.advance();
      }
    }

    return { type: 'FootnoteDefinition', id: id.trim(), children };
  }

  private parseTable(): Table {
    const rows: TableRow[] = [];
    let alignments: ('left' | 'center' | 'right' | null)[] = [];

    // Header row
    rows.push(this.parseTableRow());

    // Separator row - parse alignments (EBNF: table_align / align_marker)
    if (this.check(TokenType.PIPE)) {
      alignments = this.parseTableSeparator();
    }

    // Data rows
    while (this.check(TokenType.PIPE)) {
      rows.push(this.parseTableRow());
    }

    return {
      type: 'Table',
      header: rows[0] || { type: 'TableRow', cells: [] },
      rows: rows.slice(1),
      alignments: alignments.length > 0 ? alignments : undefined
    };
  }

  private parseTableSeparator(): ('left' | 'center' | 'right' | null)[] {
    const alignments: ('left' | 'center' | 'right' | null)[] = [];

    this.advance(); // consume |

    while (!this.isAtEnd() && !this.check(TokenType.NEWLINE)) {
      if (this.check(TokenType.SPACE)) {
        this.advance();
        continue;
      }

      const leftColon = this.check(TokenType.COLON);
      if (leftColon) this.advance();

      let dashCount = 0;
      while (this.check(TokenType.DASH)) {
        this.advance();
        dashCount++;
      }

      const rightColon = this.check(TokenType.COLON);
      if (rightColon) this.advance();

      if (dashCount > 0) {
        if (leftColon && rightColon) {
          alignments.push('center');
        } else if (leftColon) {
          alignments.push('left');
        } else if (rightColon) {
          alignments.push('right');
        } else {
          alignments.push(null);
        }
      }

      if (this.check(TokenType.PIPE)) {
        this.advance();
      }
    }

    if (this.check(TokenType.NEWLINE)) {
      this.advance();
    }

    return alignments;
  }

  private parseTableRow(): TableRow {
    const cells: TableCell[] = [];

    this.advance(); // consume |

    while (!this.isAtEnd() && !this.check(TokenType.NEWLINE)) {
      if (this.check(TokenType.SPACE)) {
        this.advance();
      }

      const content: Inline[] = [];
      while (!this.isAtEnd() && !this.check(TokenType.PIPE) && !this.check(TokenType.NEWLINE)) {
        const inline = this.parseInline();
        if (inline) content.push(inline);
      }

      // Trim trailing space from last text node
      if (content.length > 0) {
        const last = content[content.length - 1]!;
        if (last.type === 'Text') {
          (last as Text).value = (last as Text).value.trimEnd();
          if ((last as Text).value === '') {
            content.pop();
          }
        }
      }

      if (content.length > 0) {
        cells.push({ type: 'TableCell', children: content });
      }

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
    const t2 = this.peekNext(1);

    // Footnote definition: [^
    if (t.type === TokenType.LBRACKET && t2.type === TokenType.CARET) {
      return true;
    }

    // Math block: $$
    if (t.type === TokenType.DOLLAR && t2.type === TokenType.DOLLAR) {
      return true;
    }

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

  private skipSpaces(): void {
    while (this.check(TokenType.SPACE)) {
      this.advance();
    }
  }

  private isBlankLine(): boolean {
    if (this.check(TokenType.NEWLINE)) return true;
    if (this.check(TokenType.SPACE)) {
      let i = 0;
      while (this.position + i < this.tokens.length && this.tokens[this.position + i]!.type === TokenType.SPACE) i++;
      return this.position + i < this.tokens.length && this.tokens[this.position + i]!.type === TokenType.NEWLINE;
    }
    return false;
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
      case 'Shortcode': {
        const sc = inline as Shortcode;
        const params = Object.entries(sc.params).map(([k, v]) => ` ${k}="${v}"`).join('');
        return `[${sc.name}${params}]`;
      }
      default: return '';
    }
  }
}

export function parse(tokens: Token[]): Document {
  const parser = new Parser(tokens);
  return parser.parse();
}
