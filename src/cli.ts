#!/usr/bin/env bun
// MarkNext CLI - Compile .mnext files to HTML

import { compile, compileSync, type CompileOptions } from './index';
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync, watch } from 'fs';
import { resolve, dirname, extname, basename, join } from 'path';

const VERSION = '1.0.0';

interface CLIOptions extends CompileOptions {
  watch: boolean;
  output?: string;
  format: 'html' | 'json';
  quiet: boolean;
  recursive: boolean;
  standalone?: boolean;
}

function showHelp(): void {
  console.log(`
MarkNext CLI v${VERSION}

Usage:
  marknext [options] <input>

Arguments:
  input                Input file or directory (.mnext or .md)

Options:
  -o, --output <dir>   Output directory (default: same as input)
  -f, --format <type>  Output format: html, json (default: html)
  -w, --watch          Watch for changes and recompile
  -r, --recursive      Process directories recursively
  -p, --pretty         Pretty-print HTML output
  -q, --quiet          Suppress non-error output
  -s, --standalone     Wrap output in standalone HTML document
  -h, --help           Show this help message
  -v, --version        Show version number

Examples:
  marknext doc.mnext                    Compile single file
  marknext doc.mnext -o dist/           Compile to specific directory
  marknext docs/ -r                     Compile all files in directory
  marknext doc.mnext -w                 Watch and recompile on changes
  marknext doc.mnext -f json            Output AST as JSON
`);
}

function showVersion(): void {
  console.log(`MarkNext CLI v${VERSION}`);
}

function parseArgs(args: string[]): { options: CLIOptions; input: string | null } {
  const options: CLIOptions = {
    format: 'html',
    pretty: false,
    quiet: false,
    recursive: false,
    watch: false
  };

  let input: string | null = null;
  let i = 0;

  while (i < args.length) {
    const arg = args[i];

    switch (arg) {
      case '-h':
      case '--help':
        showHelp();
        process.exit(0);

      case '-v':
      case '--version':
        showVersion();
        process.exit(0);

      case '-o':
      case '--output':
        options.output = args[++i];
        break;

      case '-f':
      case '--format':
        const format = args[++i] as 'html' | 'json';
        if (format !== 'html' && format !== 'json') {
          console.error(`Error: Invalid format "${format}". Use "html" or "json".`);
          process.exit(1);
        }
        options.format = format;
        break;

      case '-w':
      case '--watch':
        options.watch = true;
        break;

      case '-r':
      case '--recursive':
        options.recursive = true;
        break;

      case '-p':
      case '--pretty':
        options.pretty = true;
        break;

      case '-q':
      case '--quiet':
        options.quiet = true;
        break;
      
      case '-s':
      case '--standalone':
        options.standalone = true;
        break;

      default:
        if (arg && !arg.startsWith('-')) {
          if (!input) {
            input = arg;
          } else {
            console.error(`Error: Unexpected argument "${arg}"`);
            process.exit(1);
          }
        } else {
          console.error(`Error: Unknown option "${arg}"`);
          process.exit(1);
        }
    }

    i++;
  }

  return { options, input };
}

function isMarkdownFile(filename: string): boolean {
  const ext = extname(filename).toLowerCase();
  return ext === '.mnext' || ext === '.md' || ext === '.markdown';
}

function getOutputFilename(inputPath: string, format: string): string {
  const base = basename(inputPath, extname(inputPath));
  return `${base}.${format === 'html' ? 'html' : 'json'}`;
}

function findFiles(dir: string, recursive: boolean): string[] {
  const files: string[] = [];

  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory() && recursive) {
      files.push(...findFiles(fullPath, recursive));
    } else if (stat.isFile() && isMarkdownFile(entry)) {
      files.push(fullPath);
    }
  }

  return files;
}

function compileFile(inputPath: string, options: CLIOptions): boolean {
  try {
    const source = readFileSync(inputPath, 'utf-8');
    const result = compile(source, { pretty: options.pretty });

    if (result.errors.length > 0 && !options.quiet) {
      console.warn(`\nWarnings for ${inputPath}:`);
      for (const error of result.errors) {
        console.warn(`  Line ${error.line}:${error.column} - ${error.message}`);
      }
    }

    let output: string;
    if (options.format === 'json') {
      output = JSON.stringify(result.ast, null, 2);
    } else {
      output = result.html;
      
      // Wrap in standalone HTML document if requested
      if (options.standalone) {
        output = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${basename(inputPath, extname(inputPath))}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      line-height: 1.6;
      max-width: 900px;
      margin: 0 auto;
      padding: 20px;
      color: #333;
      background: #fff;
    }
    h1, h2, h3, h4, h5, h6 {
      color: #222;
      border-bottom: 1px solid #ddd;
      padding-bottom: 0.3em;
    }
    code {
      background: #f4f4f4;
      padding: 2px 6px;
      border-radius: 3px;
      font-family: 'SF Mono', Monaco, Inconsolata, 'Fira Code', monospace;
    }
    pre {
      background: #f4f4f4;
      padding: 16px;
      border-radius: 6px;
      overflow-x: auto;
    }
    pre code {
      background: none;
      padding: 0;
    }
    blockquote {
      border-left: 4px solid #ddd;
      margin: 0;
      padding-left: 16px;
      color: #666;
    }
    a {
      color: #0066cc;
    }
    table {
      border-collapse: collapse;
      width: 100%;
    }
    th, td {
      border: 1px solid #ddd;
      padding: 8px 12px;
      text-align: left;
    }
    th {
      background: #f8f8f8;
    }
    .footnotes {
      margin-top: 2em;
      padding-top: 1em;
      border-top: 1px solid #ddd;
    }
    .footnote {
      font-size: 0.9em;
      margin-bottom: 0.5em;
    }
    .footnote-ref {
      font-size: 0.8em;
      vertical-align: super;
    }
    .math {
      font-family: 'Latin Modern Math', 'STIX Two Math', serif;
    }
    .math.block {
      text-align: center;
      margin: 1em 0;
    }
  </style>
</head>
<body>
${output}
</body>
</html>`;
      }
    }

    // Determine output path
    let outputPath: string;
    if (options.output) {
      // Check if output is a directory
      const outputStat = existsSync(options.output) && statSync(options.output);
      if (outputStat && outputStat.isDirectory()) {
        outputPath = join(options.output, getOutputFilename(inputPath, options.format));
      } else {
        outputPath = options.output;
      }
    } else {
      const dir = dirname(inputPath);
      outputPath = join(dir, getOutputFilename(inputPath, options.format));
    }

    // Ensure output directory exists
    const outputDir = dirname(outputPath);
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
    }

    writeFileSync(outputPath, output, 'utf-8');

    if (!options.quiet) {
      console.log(`✓ ${inputPath} → ${outputPath}`);
    }

    return true;
  } catch (error) {
    console.error(`✗ Error compiling ${inputPath}:`, error instanceof Error ? error.message : error);
    return false;
  }
}

function compileDirectory(dir: string, options: CLIOptions): { success: number; failed: number } {
  const files = findFiles(dir, options.recursive);

  if (files.length === 0) {
    if (!options.quiet) {
      console.log(`No .mnext or .md files found in ${dir}`);
    }
    return { success: 0, failed: 0 };
  }

  let success = 0;
  let failed = 0;

  for (const file of files) {
    if (compileFile(file, options)) {
      success++;
    } else {
      failed++;
    }
  }

  return { success, failed };
}

function watchFile(inputPath: string, options: CLIOptions): void {
  console.log(`👁  Watching ${inputPath} for changes...`);
  console.log(`   Press Ctrl+C to stop\n`);

  // Initial compile
  compileFile(inputPath, options);

  // Watch for changes
  const watcher = watch(inputPath, (eventType) => {
    if (eventType === 'change') {
      if (!options.quiet) {
        console.log(`\n📝 Change detected, recompiling...`);
      }
      compileFile(inputPath, options);
    }
  });

  // Handle Ctrl+C gracefully
  process.on('SIGINT', () => {
    console.log('\n\n👋 Stopping watcher...');
    watcher.close();
    process.exit(0);
  });
}

function watchDirectory(dir: string, options: CLIOptions): void {
  console.log(`👁  Watching ${dir} for changes...`);
  console.log(`   Press Ctrl+C to stop\n`);

  // Initial compile
  compileDirectory(dir, options);

  // Watch directory recursively
  const watcher = watch(dir, { recursive: true }, (eventType, filename) => {
    if (filename && isMarkdownFile(filename) && eventType === 'change') {
      const fullPath = join(dir, filename);
      if (!options.quiet) {
        console.log(`\n📝 ${filename} changed, recompiling...`);
      }
      compileFile(fullPath, options);
    }
  });

  process.on('SIGINT', () => {
    console.log('\n\n👋 Stopping watcher...');
    watcher.close();
    process.exit(0);
  });
}

function main(): void {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    showHelp();
    process.exit(0);
  }

  const { options, input } = parseArgs(args);

  if (!input) {
    console.error('Error: No input file or directory specified.');
    console.error('Use --help for usage information.');
    process.exit(1);
  }

  const inputPath = resolve(input);

  if (!existsSync(inputPath)) {
    console.error(`Error: File or directory not found: ${input}`);
    process.exit(1);
  }

  const stat = statSync(inputPath);

  if (stat.isFile()) {
    if (!isMarkdownFile(inputPath)) {
      console.warn(`Warning: ${input} doesn't have .mnext or .md extension`);
    }

    if (options.watch) {
      watchFile(inputPath, options);
    } else {
      const success = compileFile(inputPath, options);
      process.exit(success ? 0 : 1);
    }
  } else if (stat.isDirectory()) {
    if (options.watch) {
      watchDirectory(inputPath, options);
    } else {
      const results = compileDirectory(inputPath, options);

      if (!options.quiet) {
        console.log(`\n📊 Summary: ${results.success} compiled, ${results.failed} failed`);
      }

      process.exit(results.failed > 0 ? 1 : 0);
    }
  } else {
    console.error(`Error: ${input} is not a file or directory`);
    process.exit(1);
  }
}

main();
