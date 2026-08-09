import type { Wikilink } from './wikilinks.js';
import { extractWikilinks } from './wikilinks.js';
import { parseFrontmatter } from './frontmatter.js';

/** A vault note as the domain layer sees it: path + source text. */
export interface NoteInput {
  /** Project-root-relative path with forward slashes, e.g. `World/Characters/Lan.md`. */
  path: string;
  source: string;
}

export interface ParsedNote {
  path: string;
  /** Full note source exactly as stored on disk. */
  source: string;
  /** Filename without directory or `.md` extension. */
  stem: string;
  title: string;
  aliases: string[];
  frontmatter: Record<string, unknown>;
  frontmatterErrors: string[];
  body: string;
  links: Wikilink[];
}

export function parseNote(input: NoteInput): ParsedNote {
  const { frontmatter, body, errors } = parseFrontmatter(input.source);
  const stem = (input.path.split('/').pop() ?? input.path).replace(/\.md$/i, '');
  const fmTitle = frontmatter.title;
  const title = typeof fmTitle === 'string' && fmTitle.length > 0 ? fmTitle : stem;
  const aliases = Array.isArray(frontmatter.aliases)
    ? frontmatter.aliases.filter((a): a is string => typeof a === 'string')
    : [];
  return {
    path: input.path,
    source: input.source,
    stem,
    title,
    aliases,
    frontmatter,
    frontmatterErrors: errors,
    body,
    links: extractWikilinks(body),
  };
}

export interface ResolvedLink {
  from: string;
  to: string;
  link: Wikilink;
}

export interface UnresolvedLink {
  from: string;
  link: Wikilink;
}

export interface LinkIndex {
  resolved: ResolvedLink[];
  unresolved: UnresolvedLink[];
  /** path -> paths of notes linking to it */
  backlinks: Map<string, string[]>;
}

const norm = (s: string) => s.toLowerCase();

/**
 * Resolve wikilinks across a set of notes and build the backlink index.
 * Resolution order per target: exact relative path, filename stem, title,
 * alias — all case-insensitive. First match wins within each tier;
 * ambiguous stems resolve to the shortest path for determinism.
 */
export function buildLinkIndex(notes: ParsedNote[]): LinkIndex {
  const byPath = new Map<string, ParsedNote>();
  const byStem = new Map<string, ParsedNote[]>();
  const byTitle = new Map<string, ParsedNote[]>();
  const byAlias = new Map<string, ParsedNote[]>();
  const push = (map: Map<string, ParsedNote[]>, key: string, note: ParsedNote) => {
    const list = map.get(key);
    if (list) list.push(note);
    else map.set(key, [note]);
  };
  for (const note of notes) {
    byPath.set(norm(note.path), note);
    byPath.set(norm(note.path.replace(/\.md$/i, '')), note);
    push(byStem, norm(note.stem), note);
    push(byTitle, norm(note.title), note);
    for (const alias of note.aliases) push(byAlias, norm(alias), note);
  }
  const pick = (list: ParsedNote[] | undefined): ParsedNote | undefined => {
    if (!list || list.length === 0) return undefined;
    return [...list].sort((a, b) => a.path.length - b.path.length || (a.path < b.path ? -1 : 1))[0];
  };

  const resolved: ResolvedLink[] = [];
  const unresolved: UnresolvedLink[] = [];
  const backlinks = new Map<string, string[]>();

  for (const note of notes) {
    for (const link of note.links) {
      const key = norm(link.target);
      const target =
        byPath.get(key) ??
        pick(byStem.get(key)) ??
        pick(byTitle.get(key)) ??
        pick(byAlias.get(key));
      if (!target) {
        unresolved.push({ from: note.path, link });
        continue;
      }
      resolved.push({ from: note.path, to: target.path, link });
      const list = backlinks.get(target.path);
      if (list) {
        if (!list.includes(note.path)) list.push(note.path);
      } else {
        backlinks.set(target.path, [note.path]);
      }
    }
  }
  return { resolved, unresolved, backlinks };
}
