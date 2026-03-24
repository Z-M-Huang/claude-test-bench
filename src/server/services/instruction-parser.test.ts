import { describe, it, expect } from 'vitest';
import { parseInstructions, parseAllInstructions } from './instruction-parser.js';

describe('parseInstructions', () => {
  it('returns empty array for empty content', () => {
    expect(parseInstructions('', 'test')).toEqual([]);
  });

  it('returns empty array for whitespace-only content', () => {
    expect(parseInstructions('   \n  \n  ', 'test')).toEqual([]);
  });

  it('parses a single paragraph into a block', () => {
    const blocks = parseInstructions('Always use TypeScript for new files.', 'rules');
    expect(blocks).toHaveLength(1);
    expect(blocks[0].text).toBe('Always use TypeScript for new files.');
    expect(blocks[0].source).toBe('rules');
  });

  it('splits on bulleted list items (dash)', () => {
    const content = '- Use TypeScript\n- Avoid any types\n- Write tests';
    const blocks = parseInstructions(content, 'rules');
    expect(blocks).toHaveLength(3);
    expect(blocks[0].text).toBe('Use TypeScript');
    expect(blocks[1].text).toBe('Avoid any types');
    expect(blocks[2].text).toBe('Write tests');
  });

  it('splits on bulleted list items (asterisk)', () => {
    const content = '* First item\n* Second item';
    const blocks = parseInstructions(content, 'rules');
    expect(blocks).toHaveLength(2);
    expect(blocks[0].text).toBe('First item');
    expect(blocks[1].text).toBe('Second item');
  });

  it('splits on bulleted list items (plus)', () => {
    const content = '+ Alpha item here\n+ Beta item here';
    const blocks = parseInstructions(content, 'rules');
    expect(blocks).toHaveLength(2);
    expect(blocks[0].text).toBe('Alpha item here');
    expect(blocks[1].text).toBe('Beta item here');
  });

  it('splits on numbered list items', () => {
    const content = '1. First step\n2. Second step\n3. Third step';
    const blocks = parseInstructions(content, 'rules');
    expect(blocks).toHaveLength(3);
    expect(blocks[0].text).toBe('First step');
    expect(blocks[1].text).toBe('Second step');
    expect(blocks[2].text).toBe('Third step');
  });

  it('splits on paragraph breaks (double newlines)', () => {
    const content = 'First paragraph here.\n\nSecond paragraph here.';
    const blocks = parseInstructions(content, 'rules');
    expect(blocks).toHaveLength(2);
    expect(blocks[0].text).toBe('First paragraph here.');
    expect(blocks[1].text).toBe('Second paragraph here.');
  });

  it('treats actionable headings as standalone blocks', () => {
    const content = '## Always use strict mode\n\nSome content after heading.';
    const blocks = parseInstructions(content, 'rules');
    const headingBlock = blocks.find((b) => b.text.includes('strict mode'));
    expect(headingBlock).toBeDefined();
    expect(headingBlock?.text).toBe('Always use strict mode');
  });

  it('detects directive keywords as actionable headings', () => {
    const directives = [
      '## Must validate inputs',
      '## Should test thoroughly',
      '## Never skip reviews',
      '## Ensure coverage above 90%',
      '## Avoid global state',
    ];
    for (const heading of directives) {
      const blocks = parseInstructions(`${heading}\n\nBody text goes here.`, 'rules');
      const headingText = heading.replace(/^## /, '');
      const match = blocks.find((b) => b.text === headingText);
      expect(match, `Expected "${headingText}" to be actionable`).toBeDefined();
    }
  });

  it('detects imperative verb headings as actionable', () => {
    const verbs = [
      'Use TypeScript', 'Run tests', 'Add error handling', 'Set up CI',
      'Create backups', 'Delete temp files', 'Install dependencies',
      'Configure linter', 'Enable strict mode', 'Disable debug logging',
      'Check return values', 'Verify signatures', 'Test edge cases',
      'Write documentation', 'Read the docs first', 'Update packages',
      'Fix broken builds', 'Apply patches', 'Follow conventions',
      'Include headers', 'Exclude binaries', 'Import from index',
      'Export named only', 'Call super first', 'Return early',
      'Throw on invalid', 'Handle errors', 'Log warnings',
      'Format with prettier', 'Lint before commit', 'Build artifacts',
      'Deploy to staging', 'Commit atomically', 'Push to remote',
      'Pull before push', 'Merge with squash', 'Rebase on main',
      'Remove unused code',
    ];
    for (const verb of verbs) {
      const content = `## ${verb}\n\nSome body content.`;
      const blocks = parseInstructions(content, 'rules');
      const match = blocks.find((b) => b.text === verb);
      expect(match, `Expected "${verb}" to be actionable`).toBeDefined();
    }
  });

  it('uses non-actionable headings as context prefix', () => {
    const content = '## Code Quality\n- Always lint code\n- Use strict mode';
    const blocks = parseInstructions(content, 'rules');

    expect(blocks.length).toBeGreaterThanOrEqual(2);
    const lintBlock = blocks.find((b) => b.text.includes('lint'));
    expect(lintBlock?.text).toContain('[Code Quality]');
  });

  it('deduplicates identical blocks', () => {
    const content = '- Same rule here\n\n- Same rule here';
    const blocks = parseInstructions(content, 'rules');
    expect(blocks).toHaveLength(1);
    expect(blocks[0].text).toBe('Same rule here');
  });

  it('discards very short blocks (< 5 chars)', () => {
    const content = '- OK\n- This is a real instruction';
    const blocks = parseInstructions(content, 'rules');
    expect(blocks).toHaveLength(1);
    expect(blocks[0].text).toBe('This is a real instruction');
  });

  it('collapses internal whitespace', () => {
    const content = '-   Lots   of    spaces   here';
    const blocks = parseInstructions(content, 'rules');
    expect(blocks[0].text).toBe('Lots of spaces here');
  });

  it('ignores formatting-only headings', () => {
    const content = '## ---\nSome real content here.';
    const blocks = parseInstructions(content, 'rules');
    const dashBlock = blocks.find((b) => b.text === '---');
    expect(dashBlock).toBeUndefined();
  });

  it('handles heading levels 1-6', () => {
    const content = '# H1 heading\n## H2 heading\n### H3 heading\n- Item under H3';
    const blocks = parseInstructions(content, 'rules');
    expect(blocks.length).toBeGreaterThan(0);
  });

  it('flushes trailing block at end of content', () => {
    const content = 'Some trailing content without newline';
    const blocks = parseInstructions(content, 'rules');
    expect(blocks).toHaveLength(1);
    expect(blocks[0].text).toBe('Some trailing content without newline');
  });

  it('handles mixed content: headings, lists, paragraphs', () => {
    const content = [
      '## Safety',
      '- Never commit secrets',
      '- Always review diffs',
      '',
      '## Use logging for debugging',
      '',
      'Paragraph about coding style.',
    ].join('\n');
    const blocks = parseInstructions(content, 'rules');
    expect(blocks.length).toBeGreaterThanOrEqual(4);
    expect(blocks.some((b) => b.text.includes('commit secrets'))).toBe(true);
    expect(blocks.some((b) => b.text.includes('review diffs'))).toBe(true);
    expect(blocks.some((b) => b.text === 'Use logging for debugging')).toBe(true);
    expect(blocks.some((b) => b.text.includes('coding style'))).toBe(true);
  });
});

describe('parseAllInstructions', () => {
  it('returns empty array for empty entries', () => {
    expect(parseAllInstructions([])).toEqual([]);
  });

  it('combines blocks from multiple sources', () => {
    const entries = [
      { content: '- Rule A', source: 'file1' },
      { content: '- Rule B', source: 'file2' },
    ];
    const blocks = parseAllInstructions(entries);
    expect(blocks).toHaveLength(2);
    expect(blocks[0].source).toBe('file1');
    expect(blocks[1].source).toBe('file2');
  });

  it('does not deduplicate across sources', () => {
    const entries = [
      { content: '- Same rule', source: 'file1' },
      { content: '- Same rule', source: 'file2' },
    ];
    const blocks = parseAllInstructions(entries);
    expect(blocks).toHaveLength(2);
  });

  it('skips empty entries', () => {
    const entries = [
      { content: '', source: 'empty' },
      { content: '- Real rule here', source: 'real' },
    ];
    const blocks = parseAllInstructions(entries);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].source).toBe('real');
  });
});
