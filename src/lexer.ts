import { TokenType, isCodeFence, isThematicBreak } from './tokens';
import type { Token, Position } from './tokens';

export class Lexer {
  private input: string;
  private position: number = 0;
  private line: number = 1;
  private column: number = 1;
  private tokens: Token[] = [];

  constructor(input: string) {
    this.input = input;
  }

  tokenize(): Token[] {
    while (!this.isAtEnd()) {
      // Skip spaces and tabs at line start only
      if (this.column === 1) {
        this.skipWhitespace();
      }

      if (this.isAtEnd()) break;

      const char = this.peek();
      const startPos = this.getPosition();

      // Check for special sequences first
      if (this.matchSequence('```')) {
        this.addToken(TokenType.CODE_FENCE, '```', startPos);
        continue;
      }

      // Check for thematic break ---
      if (char === '-' && this.checkThematicBreak()) {
        const dashes = this.readWhile(c => c === '-');
        this.addToken(TokenType.THEMATIC_BREAK, dashes, startPos);
        continue;
      }

      // Single character tokens
      switch (char) {
        case '\n':
        case '\r':
          this.readNewline();
          this.addToken(TokenType.NEWLINE, '\n', startPos);
          continue;

        case ' ':
        case '\t':
          this.advance();
          this.addToken(TokenType.SPACE, char, startPos);
          continue;

        case '#':
          const hashes = this.readWhile(c => c === '#');
          if (hashes.length <= 6) {
            this.addToken(TokenType.HASH, hashes, startPos);
          } else {
            this.addToken(TokenType.TEXT, hashes, startPos);
          }
          continue;

        case '-':
          this.advance();
          this.addToken(TokenType.DASH, '-', startPos);
          continue;

        case '*':
          this.advance();
          this.addToken(TokenType.STAR, '*', startPos);
          continue;

        case '/':
          this.advance();
          this.addToken(TokenType.SLASH, '/', startPos);
          continue;

        case '`':
          this.advance();
          this.addToken(TokenType.BACKTICK, '`', startPos);
          continue;

        case '[':
          this.advance();
          this.addToken(TokenType.LBRACKET, '[', startPos);
          continue;

        case ']':
          this.advance();
          this.addToken(TokenType.RBRACKET, ']', startPos);
          continue;

        case '(':
          this.advance();
          this.addToken(TokenType.LPAREN, '(', startPos);
          continue;

        case ')':
          this.advance();
          this.addToken(TokenType.RPAREN, ')', startPos);
          continue;

        case '!':
          this.advance();
          this.addToken(TokenType.EXCLAIM, '!', startPos);
          continue;

        case '>':
          this.advance();
          this.addToken(TokenType.GT, '>', startPos);
          continue;

        case '|':
          this.advance();
          this.addToken(TokenType.PIPE, '|', startPos);
          continue;

        case '\\':
          this.advance();
          this.addToken(TokenType.BACKSLASH, '\\', startPos);
          continue;

        case '.':
          this.advance();
          this.addToken(TokenType.PERIOD, '.', startPos);
          continue;

        case '<':
          this.advance();
          this.addToken(TokenType.LT, '<', startPos);
          continue;

        case '_':
          this.advance();
          this.addToken(TokenType.UNDERSCORE, '_', startPos);
          continue;

        case ':':
          this.advance();
          this.addToken(TokenType.COLON, ':', startPos);
          continue;

        case '=':
          this.advance();
          this.addToken(TokenType.EQUALS, '=', startPos);
          continue;

        case '"':
          this.advance();
          this.addToken(TokenType.DQUOTE, '"', startPos);
          continue;
        
        case '^':
          this.advance();
          this.addToken(TokenType.CARET, '^', startPos);
          continue;
        
        case '$':
          this.advance();
          this.addToken(TokenType.DOLLAR, '$', startPos);
          continue;
      }

      // Read text content
      const text = this.readText();
      if (text.length > 0) {
        this.addToken(TokenType.TEXT, text, startPos);
      } else {
        // Unknown character, skip it
        this.advance();
      }
    }

    // Add EOF token
    this.tokens.push({
      type: TokenType.EOF,
      value: '',
      position: this.getPosition()
    });

    return this.tokens;
  }

  private isAtEnd(): boolean {
    return this.position >= this.input.length;
  }

  private peek(): string {
    if (this.isAtEnd()) return '\0';
    return this.input[this.position]!;
  }

  private peekNext(): string {
    if (this.position + 1 >= this.input.length) return '\0';
    return this.input[this.position + 1]!;
  }

  private advance(): string {
    const char = this.input[this.position]!;
    this.position++;
    if (char === '\n') {
      this.line++;
      this.column = 1;
    } else {
      this.column++;
    }
    return char;
  }

  private matchSequence(seq: string): boolean {
    if (this.position + seq.length > this.input.length) return false;
    const slice = this.input.slice(this.position, this.position + seq.length);
    if (slice === seq) {
      for (let i = 0; i < seq.length; i++) {
        this.advance();
      }
      return true;
    }
    return false;
  }

  private checkThematicBreak(): boolean {
    // Look ahead for 3+ dashes
    let count = 0;
    let pos = this.position;
    while (pos < this.input.length && this.input[pos] === '-') {
      count++;
      pos++;
    }
    // Must be at end of line or followed by whitespace
    if (count >= 3) {
      const next = this.input[pos];
      return next === '\n' || next === '\r' || next === ' ' || next === '\t' || pos >= this.input.length;
    }
    return false;
  }

  private readWhile(predicate: (c: string) => boolean): string {
    let result = '';
    while (!this.isAtEnd() && predicate(this.peek())) {
      result += this.advance();
    }
    return result;
  }

  private readNewline(): void {
    if (this.peek() === '\r') this.advance();
    if (this.peek() === '\n') this.advance();
  }

  private readText(): string {
    let result = '';
    const specialChars = new Set([
      '\n', '\r', ' ', '\t', '#', '-', '*', '/', '`', '[', ']',
      '(', ')', '!', '>', '|', '\\', '.', '<', '_', ':', '=', '"', '^', '$'
    ]);

    while (!this.isAtEnd() && !specialChars.has(this.peek())) {
      result += this.advance();
    }
    return result;
  }

  private skipWhitespace(): void {
    // Don't skip newlines - they're meaningful
    while (!this.isAtEnd() && (this.peek() === ' ' || this.peek() === '\t')) {
      this.advance();
    }
  }

  private getPosition(): Position {
    return {
      line: this.line,
      column: this.column,
      offset: this.position
    };
  }

  private addToken(type: TokenType, value: string, position: Position): void {
    this.tokens.push({ type, value, position });
  }
}

export function tokenize(input: string): Token[] {
  const lexer = new Lexer(input);
  return lexer.tokenize();
}
