import { compile, compileSync } from './src/index';

// Example usage
const source = `
# MarkNext Test

This is *bold* and /italic/ text.

## Features

- One way to do things
- Secure by default
- Context-free grammar

## Code Example

\`\`\`typescript
function hello(): string {
  return "world";
}
\`\`\`

> A wise quote goes here.

Visit [MarkNext](https://github.com/skorotkiewicz/marknext) for more.


---

*Thanks for reading!*
`;

console.log("=== MarkNext Source ===");
console.log(source);

console.log("\n=== Rendered HTML ===");
const html = compileSync(source);
console.log(html);
