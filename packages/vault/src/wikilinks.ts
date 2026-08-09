export interface Wikilink {
  /** Link target as written, without heading/alias parts. */
  target: string;
  /** Optional heading fragment (`[[Note#Heading]]`). */
  heading: string | null;
  /** Optional display alias (`[[Note|alias]]`). */
  alias: string | null;
  /** Whether the link is an embed (`![[Note]]`). */
  embed: boolean;
  /** Character offset of the opening bracket in the source. */
  offset: number;
}

const WIKILINK_RE = /(!)?\[\[([^\][\n]+?)\]\]/g;

/**
 * Extract wikilinks from Markdown source. Fenced code blocks and inline code
 * are skipped so `[[example]]` inside code is not a link.
 */
export function extractWikilinks(source: string): Wikilink[] {
  const links: Wikilink[] = [];
  for (const segment of nonCodeSegments(source)) {
    WIKILINK_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = WIKILINK_RE.exec(segment.text)) !== null) {
      const inner = m[2];
      if (inner === undefined) continue;
      let rest = inner;
      let alias: string | null = null;
      const pipe = rest.indexOf('|');
      if (pipe >= 0) {
        alias = rest.slice(pipe + 1).trim() || null;
        rest = rest.slice(0, pipe);
      }
      let heading: string | null = null;
      const hash = rest.indexOf('#');
      if (hash >= 0) {
        heading = rest.slice(hash + 1).trim() || null;
        rest = rest.slice(0, hash);
      }
      const target = rest.trim();
      if (target.length === 0 && heading === null) continue;
      links.push({
        target,
        heading,
        alias,
        embed: m[1] === '!',
        offset: segment.offset + m.index,
      });
    }
  }
  return links;
}

interface Segment {
  text: string;
  offset: number;
}

/** Split source into segments outside fenced code blocks and inline code. */
function nonCodeSegments(source: string): Segment[] {
  const segments: Segment[] = [];
  // Remove fenced blocks first, tracking offsets.
  const fenceRe = /^(```|~~~)[^\n]*\n[\s\S]*?^\1[^\n]*$/gm;
  let cursor = 0;
  const pushPlain = (text: string, offset: number) => {
    // Blank out inline code spans in place to preserve offsets.
    const cleaned = text.replace(/`[^`\n]*`/g, (span) => ' '.repeat(span.length));
    segments.push({ text: cleaned, offset });
  };
  let m: RegExpExecArray | null;
  while ((m = fenceRe.exec(source)) !== null) {
    pushPlain(source.slice(cursor, m.index), cursor);
    cursor = m.index + m[0].length;
  }
  pushPlain(source.slice(cursor), cursor);
  return segments;
}
