import { describe, test, expect } from "bun:test";
import { tokenize } from "../src/lexer";
import { parse } from "../src/parser";
import { compile, compileSync } from "../src/index";
import { TokenType } from "../src/tokens";

describe("MarkNext Parser", () => {

  describe("Lexer", () => {
    test("tokenizes headers", () => {
      const tokens = tokenize("# Header");
      expect(tokens[0]!.type).toBe(TokenType.HASH);
      expect(tokens[0]!.value).toBe("#");
      expect(tokens[1]!.type).toBe(TokenType.SPACE);
      expect(tokens[2]!.type).toBe(TokenType.TEXT);
    });

    test("tokenizes emphasis", () => {
      const tokens = tokenize("*bold*");
      expect(tokens[0]!.type).toBe(TokenType.STAR);
      expect(tokens[1]!.type).toBe(TokenType.TEXT);
      expect(tokens[2]!.type).toBe(TokenType.STAR);
    });

    test("tokenizes code fences", () => {
      const tokens = tokenize("```\ncode\n```");
      expect(tokens[0]!.type).toBe(TokenType.CODE_FENCE);
    });

    test("tokenizes thematic break", () => {
      const tokens = tokenize("---");
      expect(tokens[0]!.type).toBe(TokenType.THEMATIC_BREAK);
    });
  });

  describe("Parser", () => {
    test("parses header level 1", () => {
      const ast = parse(tokenize("# Title"));
      expect(ast.children[0]!.type).toBe("Header");
      expect((ast.children[0]! as any).level).toBe(1);
    });

    test("parses header level 2", () => {
      const ast = parse(tokenize("## Subtitle"));
      expect(ast.children[0]!.type).toBe("Header");
      expect((ast.children[0]! as any).level).toBe(2);
    });

    test("parses bold text", () => {
      const ast = parse(tokenize("*bold text*"));
      expect(ast.children[0]!.type).toBe("Paragraph");
      expect((ast.children[0]! as any).children[0]!.type).toBe("Bold");
    });

    test("parses italic text", () => {
      const ast = parse(tokenize("/italic text/"));
      expect(ast.children[0]!.type).toBe("Paragraph");
      expect((ast.children[0]! as any).children[0]!.type).toBe("Italic");
    });

    test("parses combined emphasis", () => {
      const ast = parse(tokenize("*/bold italic/*"));
      const bold = (ast.children[0]! as any).children[0];
      expect(bold.type).toBe("Bold");
      expect(bold.children[0]!.type).toBe("Italic");
    });

    test("parses inline code", () => {
      const ast = parse(tokenize("`code`"));
      expect((ast.children[0]! as any).children[0]!.type).toBe("Code");
    });

    test("parses code block", () => {
      const ast = parse(tokenize("```js\ncode\n```"));
      expect(ast.children[0]!.type).toBe("CodeBlock");
      expect((ast.children[0]! as any).language).toBe("js");
    });

    test("parses unordered list", () => {
      const ast = parse(tokenize("- item 1\n- item 2"));
      expect(ast.children[0]!.type).toBe("List");
      expect((ast.children[0]! as any).ordered).toBe(false);
      expect((ast.children[0]! as any).children.length).toBe(2);
    });

    test("parses ordered list", () => {
      const ast = parse(tokenize("1. item 1\n2. item 2"));
      expect(ast.children[0]!.type).toBe("List");
      expect((ast.children[0]! as any).ordered).toBe(true);
    });

    test("parses blockquote", () => {
      const ast = parse(tokenize("> quote"));
      expect(ast.children[0]!.type).toBe("Blockquote");
    });

    test("parses thematic break", () => {
      const ast = parse(tokenize("---"));
      expect(ast.children[0]!.type).toBe("ThematicBreak");
    });

    test("parses link", () => {
      const ast = parse(tokenize("[text](url)"));
      const link = (ast.children[0]! as any).children[0];
      expect(link.type).toBe("Link");
      expect(link.url).toBe("url");
    });

    test("parses image", () => {
      const ast = parse(tokenize("![alt](img.png)"));
      const img = (ast.children[0]! as any).children[0];
      expect(img.type).toBe("Image");
      expect(img.url).toBe("img.png");
      expect(img.alt).toBe("alt");
    });
  });

  describe("HTML Renderer", () => {
    test("renders headers", () => {
      const html = compileSync("# Title");
      expect(html).toContain("<h1>");
      expect(html).toContain("</h1>");
      expect(html).toContain("Title");
    });

    test("renders bold", () => {
      const html = compileSync("*bold*");
      expect(html).toContain("<strong>");
      expect(html).toContain("bold");
      expect(html).toContain("</strong>");
    });

    test("renders italic", () => {
      const html = compileSync("/italic/");
      expect(html).toContain("<em>");
      expect(html).toContain("italic");
      expect(html).toContain("</em>");
    });

    test("renders code", () => {
      const html = compileSync("`code`");
      expect(html).toContain("<code>");
      expect(html).toContain("code");
    });

    test("renders code block", () => {
      const html = compileSync("```js\ncode\n```");
      expect(html).toContain("<pre>");
      expect(html).toContain("<code");
      expect(html).toContain("class=\"language-js\"");
    });

    test("renders unordered list", () => {
      const html = compileSync("- a\n- b");
      expect(html).toContain("<ul>");
      expect(html).toContain("<li>");
      expect(html).toContain("</ul>");
    });

    test("renders ordered list", () => {
      const html = compileSync("1. a\n2. b");
      expect(html).toContain("<ol>");
      expect(html).toContain("<li>");
    });

    test("renders blockquote", () => {
      const html = compileSync("> quote");
      expect(html).toContain("<blockquote>");
      expect(html).toContain("quote");
    });

    test("renders thematic break", () => {
      const html = compileSync("---");
      expect(html).toContain("<hr />");
    });

    test("renders link", () => {
      const html = compileSync("[text](https://example.com)");
      expect(html).toContain("<a");
      expect(html).toContain('href="https://example.com"');
      expect(html).toContain("text");
    });

    test("renders image", () => {
      const html = compileSync("![alt](img.png)");
      expect(html).toContain("<img");
      expect(html).toContain('src="img.png"');
      expect(html).toContain('alt="alt"');
    });

    test("escapes HTML in text", () => {
      const html = compileSync("<script>");
      expect(html).toContain("&lt;script&gt;");
      expect(html).not.toContain("<script>");
    });

    test("handles line breaks", () => {
      const html = compileSync("line1\\\nline2");
      expect(html).toContain("<br />");
    });
  });

  describe("Integration", () => {
    test("compiles full document", () => {
      const source = `
# MarkNext

*Bold* and /italic/ text.

## Features

- Feature 1
- Feature 2

> A quote

[Link](url)
`;
      const html = compileSync(source);

      expect(html).toContain("<h1>MarkNext</h1>");
      expect(html).toContain("<strong>Bold</strong>");
      expect(html).toContain("<em>italic</em>");
      expect(html).toContain("<h2>Features</h2>");
      expect(html).toContain("<ul>");
      expect(html).toContain("<blockquote>");
      expect(html).toContain('href="url"');
    });

    test("compile() returns errors array", () => {
      const result = compile("# Test");
      expect(result.errors).toBeDefined();
      expect(Array.isArray(result.errors)).toBe(true);
    });

    test("compile() returns AST when sourceMap enabled", () => {
      const result = compile("# Test", { sourceMap: true });
      expect(result.ast).toBeDefined();
      expect(result.ast?.type).toBe("Document");
    });
  });

  describe("MarkNext Differences from Markdown", () => {
    test("uses * for bold, not **", () => {
      // In MarkNext: *bold* is correct
      const ast = parse(tokenize("*bold*"));
      expect((ast.children[0]! as any).children[0]!.type).toBe("Bold");
    });

    test("uses / for italic, not _", () => {
      // In MarkNext: /italic/ is correct
      const ast = parse(tokenize("/italic/"));
      expect((ast.children[0]! as any).children[0]!.type).toBe("Italic");
    });

    test("uses - for lists, not *", () => {
      // In MarkNext: - item is correct
      const ast = parse(tokenize("- item"));
      expect(ast.children[0]!.type).toBe("List");
    });

    test("underscores are just text", () => {
      // In MarkNext: _text_ is NOT italic, it's just text
      const ast = parse(tokenize("_text_"));
      expect((ast.children[0]! as any).children[0]!.type).toBe("Text");
    });
  });
});
