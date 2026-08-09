import { parseDocument, stringify } from 'yaml';

export interface FrontmatterResult {
  /** Parsed frontmatter object; empty object when no block exists. */
  frontmatter: Record<string, unknown>;
  /** Note body without the frontmatter block. */
  body: string;
  /** Raw frontmatter text between the delimiters (without them), or null. */
  raw: string | null;
  /** Parse problems. A malformed block never throws — the note stays usable. */
  errors: string[];
}

const FM_OPEN = /^---\r?\n/;

/**
 * Extract and parse a leading YAML frontmatter block.
 * Never throws: worldbuilding notes must stay readable even when the
 * frontmatter is broken (spec: files are the source of truth).
 */
export function parseFrontmatter(source: string): FrontmatterResult {
  if (!FM_OPEN.test(source)) {
    return { frontmatter: {}, body: source, raw: null, errors: [] };
  }
  const rawStart = source.indexOf('\n') + 1;
  const close = /\r?\n---(\r?\n|$)/.exec(source.slice(rawStart));
  if (close?.index === undefined) {
    return {
      frontmatter: {},
      body: source,
      raw: null,
      errors: ['frontmatter block is not closed with ---'],
    };
  }
  const raw = source.slice(rawStart, rawStart + close.index);
  const body = source.slice(rawStart + close.index + close[0].length);

  // Normalize CRLF so a trailing \r never leaks into scalar values.
  const doc = parseDocument(raw.replace(/\r\n/g, '\n').replace(/\r$/, ''));
  const errors = doc.errors.map((e) => e.message);
  const value: unknown = doc.toJS();
  const frontmatter =
    value !== null && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  if (value !== null && frontmatter !== value) {
    errors.push('frontmatter is not a mapping');
  }
  return { frontmatter, body, raw, errors };
}

/** Serialize frontmatter + body back into note source. */
export function serializeNote(frontmatter: Record<string, unknown>, body: string): string {
  if (Object.keys(frontmatter).length === 0) return body;
  const yamlText = stringify(frontmatter);
  return `---\n${yamlText}---\n${body}`;
}
