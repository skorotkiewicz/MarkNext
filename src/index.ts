// MarkNext Parser - Main Entry Point
// A minimal, unambiguous, and secure Markdown successor

export { tokenize, Lexer } from './lexer';
export { parse, Parser } from './parser';
export { renderToHTML, HTMLRenderer } from './renderer';
export { TokenType, type Token, type Position, type TokenWithLiteral } from './tokens';
export { parseConfig, loadConfig, type MarkNextConfig } from './config';
export type {
  Node, NodeType, Document, Block, Header, Paragraph, List, ListItem,
  CodeBlock, Blockquote, ThematicBreak, Table, TableRow, TableCell,
  Inline, Text, Bold, Italic, Code, Link, Image, LineBreak, Escape,
  Shortcode
} from './ast';

import { tokenize } from './lexer';
import { parse, Parser } from './parser';
import { renderToHTML } from './renderer';
import type { RenderOptions } from './renderer';

export type CompatibilityMode = 'strict' | 'warn' | 'legacy';

export interface CompileOptions extends RenderOptions {
  sourceMap?: boolean;
  hooks?: {
    pre?: (source: string) => string;
    post?: (html: string) => string;
  };
  compatibility?: CompatibilityMode;
}

export interface CompileResult {
  html: string;
  errors: Array<{ message: string; line: number; column: number }>;
  ast?: import('./ast').Document;
}

/**
 * Compile MarkNext source to HTML
 */
export function compile(source: string, options: CompileOptions = {}): CompileResult {
  // Step 1: Pre-processing hooks
  const processedSource = options.hooks?.pre ? options.hooks.pre(source) : source;

  // Step 2: Tokenize
  const tokens = tokenize(processedSource);

  // Step 3: Parse
  const parser = new Parser(tokens, options.compatibility);
  const ast = parser.parse();
  const errors = parser.getErrors();

  // Step 4: Render
  let html = renderToHTML(ast, options);

  // Step 5: Post-processing hooks
  html = options.hooks?.post ? options.hooks.post(html) : html;

  return {
    html,
    errors,
    ast: options.sourceMap ? ast : undefined
  };
}

// Eager version for synchronous usage
export function compileSync(source: string, options: RenderOptions = {}): string {
  const tokens = tokenize(source);
  const parser = new Parser(tokens);
  const ast = parser.parse();
  return renderToHTML(ast, options);
}

// CLI usage helper
export async function compileFile(inputPath: string, outputPath?: string, options: CompileOptions = {}): Promise<string> {
  const fs = await import('fs/promises');
  const path = await import('path');

  const source = await fs.readFile(inputPath, 'utf-8');
  const result = compile(source, options);

  if (result.errors.length > 0) {
    console.warn('Parse errors:', result.errors);
  }

  if (outputPath) {
    await fs.writeFile(outputPath, result.html, 'utf-8');
  }

  return result.html;
}

// Version
export const VERSION = '1.0.3';
