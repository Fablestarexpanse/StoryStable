/**
 * Fountain screenplay parsing (spec §6.2).
 *
 * Fountain is the durable screenplay format: the file stays readable and
 * editable as plain text, and this parser is a *view* over it rather than an
 * import step. That constraint shapes the design — every element records the
 * source line it came from, so the formatted view and the raw text can stay
 * in sync, and nothing is normalized away on the way through.
 *
 * Reference: https://fountain.io/syntax
 */

export type ElementKind =
  | 'scene_heading'
  | 'action'
  | 'character'
  | 'dialogue'
  | 'parenthetical'
  | 'transition'
  | 'section'
  | 'synopsis'
  | 'page_break'
  | 'note';

export interface ScreenplayElement {
  kind: ElementKind;
  text: string;
  /** 0-based index of the first source line this element came from. */
  line: number;
  /** Heading number for `section` (1 = `#`, 2 = `##`, …). */
  depth?: number;
  /** Scene number captured from a `#42#` suffix on a scene heading. */
  sceneNumber?: string;
  /** True for the second speaker of a dual-dialogue pair (`^`). */
  dual?: boolean;
}

export interface Screenplay {
  /** Title-page key/value pairs, keys lowercased. */
  titlePage: Record<string, string>;
  elements: ScreenplayElement[];
}

export interface SceneSummary {
  heading: string;
  /** Interior/exterior prefix when recognizable. */
  setting: string | null;
  /** Time of day after the final dash, when present. */
  timeOfDay: string | null;
  sceneNumber: string | null;
  line: number;
  /** Speaking characters, in order of first appearance. */
  characters: string[];
  /** Element count belonging to this scene, for a rough length signal. */
  elementCount: number;
}

const SCENE_PREFIXES = /^(INT\.?\/EXT\.?|EXT\.?\/INT\.?|I\/E\.?|INT\.?|EXT\.?|EST\.?)[\s.]/i;
const TRANSITION_SUFFIX = /\b(TO:|OUT\.|IN:)$/;

const isUpperCase = (text: string): boolean => text === text.toUpperCase() && /[A-Z]/.test(text);

/**
 * Remove boneyard comments (slash-star … star-slash), replacing each with the
 * same number of newlines so every element's recorded source line still
 * matches the file the user is editing.
 */
function stripBoneyard(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, (match) => {
    const newlines = match.split('\n').length - 1;
    return '\n'.repeat(newlines);
  });
}

/** Extract `[[note]]` spans; they are not screenplay content. */
function stripInlineNotes(text: string): { text: string; notes: string[] } {
  const notes: string[] = [];
  const cleaned = text.replace(/\[\[([\s\S]*?)\]\]/g, (_, note: string) => {
    notes.push(note.trim());
    return '';
  });
  return { text: cleaned, notes };
}

/**
 * Parse the title page: `Key: Value` pairs before the first blank line.
 * Returns the index of the first body line so parsing can resume there.
 */
function parseTitlePage(lines: readonly string[]): {
  titlePage: Record<string, string>;
  bodyStart: number;
} {
  const titlePage: Record<string, string> = {};
  // A title page exists only if the very first non-empty line is a key.
  const first = lines.findIndex((l) => l.trim() !== '');
  if (first === -1 || !/^[A-Za-z ]+:/.test(lines[first] ?? '')) {
    return { titlePage, bodyStart: 0 };
  }

  let i = first;
  let key: string | null = null;
  for (; i < lines.length; i++) {
    const raw = lines[i] ?? '';
    if (raw.trim() === '') break;
    const match = /^([A-Za-z ]+):\s*(.*)$/.exec(raw);
    if (match?.[1] !== undefined) {
      key = match[1].trim().toLowerCase();
      titlePage[key] = (match[2] ?? '').trim();
    } else if (key !== null) {
      // Indented continuation line.
      titlePage[key] = `${titlePage[key] ?? ''}\n${raw.trim()}`.trim();
    }
  }
  // Skip the blank line that terminates the title page.
  while (i < lines.length && (lines[i] ?? '').trim() === '') i++;
  return { titlePage, bodyStart: i };
}

/** Parse Fountain source. Never throws; unrecognized text becomes action. */
export function parseFountain(source: string): Screenplay {
  const lines = stripBoneyard(source).split('\n');
  const { titlePage, bodyStart } = parseTitlePage(lines);
  const elements: ScreenplayElement[] = [];

  for (let i = bodyStart; i < lines.length; i++) {
    const raw = lines[i] ?? '';
    const trimmed = raw.trim();
    if (trimmed === '') continue;

    const { text: withoutNotes, notes } = stripInlineNotes(trimmed);
    for (const note of notes) {
      if (note !== '') elements.push({ kind: 'note', text: note, line: i });
    }
    const line = withoutNotes.trim();
    if (line === '') continue;

    // Section headings and synopses.
    const section = /^(#+)\s*(.*)$/.exec(line);
    if (section?.[1] !== undefined) {
      elements.push({
        kind: 'section',
        text: (section[2] ?? '').trim(),
        line: i,
        depth: section[1].length,
      });
      continue;
    }
    if (line.startsWith('=') && !line.startsWith('==')) {
      elements.push({ kind: 'synopsis', text: line.slice(1).trim(), line: i });
      continue;
    }
    if (/^={3,}$/.test(line)) {
      elements.push({ kind: 'page_break', text: '', line: i });
      continue;
    }

    // Scene heading: recognized prefix, or forced with a leading dot.
    const forcedScene = line.startsWith('.') && !line.startsWith('..');
    if (forcedScene || SCENE_PREFIXES.test(line)) {
      const body = forcedScene ? line.slice(1).trim() : line;
      const numbered = /^(.*?)\s*#([^#]+)#$/.exec(body);
      elements.push({
        kind: 'scene_heading',
        text: (numbered?.[1] ?? body).trim(),
        line: i,
        ...(numbered?.[2] !== undefined ? { sceneNumber: numbered[2].trim() } : {}),
      });
      continue;
    }

    // Transition: forced with `>`, or uppercase ending in TO:/OUT./IN:
    if (line.startsWith('>') && !line.endsWith('<')) {
      elements.push({ kind: 'transition', text: line.slice(1).trim(), line: i });
      continue;
    }
    if (isUpperCase(line) && TRANSITION_SUFFIX.test(line)) {
      elements.push({ kind: 'transition', text: line, line: i });
      continue;
    }

    // Character cue: uppercase (or forced with @), followed by a non-blank
    // line. Without that following line it is just action.
    const forcedCharacter = line.startsWith('@');
    const nextLine = (lines[i + 1] ?? '').trim();
    const looksLikeCharacter = forcedCharacter || (isUpperCase(line) && !/^[\d\s]+$/.test(line));
    if (looksLikeCharacter && nextLine !== '') {
      const dual = line.endsWith('^');
      const name = (forcedCharacter ? line.slice(1) : line).replace(/\^$/, '').trim();
      elements.push({ kind: 'character', text: name, line: i, ...(dual ? { dual } : {}) });

      // Consume the dialogue block until a blank line.
      for (i++; i < lines.length; i++) {
        const blockLine = (lines[i] ?? '').trim();
        if (blockLine === '') break;
        const cleaned = stripInlineNotes(blockLine);
        for (const note of cleaned.notes) {
          if (note !== '') elements.push({ kind: 'note', text: note, line: i });
        }
        const content = cleaned.text.trim();
        if (content === '') continue;
        elements.push({
          kind: /^\(.*\)$/.test(content) ? 'parenthetical' : 'dialogue',
          text: content,
          line: i,
        });
      }
      continue;
    }

    // Everything else is action. A leading `!` forces it.
    elements.push({
      kind: 'action',
      text: line.startsWith('!') ? line.slice(1) : line,
      line: i,
    });
  }

  return { titlePage, elements };
}

/** Scene-level summary for the navigator. */
export function sceneSummaries(screenplay: Screenplay): SceneSummary[] {
  const scenes: SceneSummary[] = [];
  let current: SceneSummary | null = null;

  for (const element of screenplay.elements) {
    if (element.kind === 'scene_heading') {
      const settingMatch = SCENE_PREFIXES.exec(element.text);
      const dash = element.text.lastIndexOf(' - ');
      current = {
        heading: element.text,
        setting: settingMatch?.[1] ?? null,
        timeOfDay: dash === -1 ? null : element.text.slice(dash + 3).trim(),
        sceneNumber: element.sceneNumber ?? null,
        line: element.line,
        characters: [],
        elementCount: 0,
      };
      scenes.push(current);
      continue;
    }
    if (!current) continue;
    current.elementCount++;
    if (element.kind === 'character' && !current.characters.includes(element.text)) {
      current.characters.push(element.text);
    }
  }
  return scenes;
}

/** Every speaking character across the screenplay, in first-appearance order. */
export function speakingCharacters(screenplay: Screenplay): string[] {
  const seen: string[] = [];
  for (const element of screenplay.elements) {
    if (element.kind === 'character' && !seen.includes(element.text)) {
      seen.push(element.text);
    }
  }
  return seen;
}

/**
 * Render a screenplay back to Fountain. Formatted output is regenerated
 * rather than round-tripped byte-for-byte — the raw file remains the truth,
 * and this exists for generating new material, not for rewriting the user's.
 */
export function serializeFountain(screenplay: Screenplay): string {
  const out: string[] = [];
  const titleKeys = Object.keys(screenplay.titlePage);
  if (titleKeys.length > 0) {
    for (const key of titleKeys) {
      const label = key.charAt(0).toUpperCase() + key.slice(1);
      out.push(`${label}: ${screenplay.titlePage[key] ?? ''}`);
    }
    out.push('');
  }

  let previous: ElementKind | null = null;
  for (const element of screenplay.elements) {
    const inDialogue = previous === 'character' || previous === 'parenthetical';
    const continuesDialogue =
      inDialogue && (element.kind === 'dialogue' || element.kind === 'parenthetical');
    if (previous !== null && !continuesDialogue) out.push('');

    switch (element.kind) {
      case 'section':
        out.push(`${'#'.repeat(element.depth ?? 1)} ${element.text}`);
        break;
      case 'synopsis':
        out.push(`= ${element.text}`);
        break;
      case 'page_break':
        out.push('===');
        break;
      case 'scene_heading':
        out.push(
          element.sceneNumber === undefined
            ? element.text
            : `${element.text} #${element.sceneNumber}#`,
        );
        break;
      case 'transition':
        out.push(element.text);
        break;
      case 'character':
        out.push(element.dual === true ? `${element.text} ^` : element.text);
        break;
      case 'note':
        out.push(`[[${element.text}]]`);
        break;
      default:
        out.push(element.text);
    }
    previous = element.kind;
  }
  return `${out.join('\n')}\n`;
}
