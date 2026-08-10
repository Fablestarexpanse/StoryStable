/**
 * Entity templates (spec §5.2 / PRODUCT_SPEC §5.2).
 *
 * A template defines default frontmatter, suggested body sections, and the
 * folder new entities land in. Users may add their own templates later; these
 * are the initial built-ins.
 */

export type EntityType =
  | 'character'
  | 'location'
  | 'faction'
  | 'culture'
  | 'creature'
  | 'technology'
  | 'item'
  | 'event'
  | 'rule'
  | 'theme'
  | 'research';

export interface EntityTemplate {
  entityType: EntityType;
  label: string;
  /** Folder new entities of this type are created in. */
  folder: string;
  /** Extra frontmatter beyond the shared base fields. */
  defaults: Record<string, unknown>;
  /** Suggested `##` sections seeded in the body. */
  sections: string[];
}

export const ENTITY_TEMPLATES: readonly EntityTemplate[] = [
  {
    entityType: 'character',
    label: 'Character',
    folder: 'World/Characters',
    defaults: { canon_level: 'guidance', relationships: [] },
    sections: ['Appearance', 'Voice', 'Objectives', 'History', 'Continuity'],
  },
  {
    entityType: 'location',
    label: 'Location',
    folder: 'World/Locations',
    defaults: { canon_level: 'guidance' },
    sections: ['Description', 'Atmosphere', 'Access', 'History'],
  },
  {
    entityType: 'faction',
    label: 'Faction',
    folder: 'World/Factions',
    defaults: { canon_level: 'guidance' },
    sections: ['Purpose', 'Structure', 'Territory', 'Relationships'],
  },
  {
    entityType: 'culture',
    label: 'Culture',
    folder: 'World/Cultures',
    defaults: { canon_level: 'guidance' },
    sections: ['Values', 'Customs', 'Language', 'Conflicts'],
  },
  {
    entityType: 'creature',
    label: 'Creature',
    folder: 'World/Creatures',
    defaults: { canon_level: 'guidance' },
    sections: ['Description', 'Behavior', 'Habitat', 'Danger'],
  },
  {
    entityType: 'technology',
    label: 'Technology',
    folder: 'World/Technology',
    defaults: { canon_level: 'guidance' },
    sections: ['Function', 'Limits', 'Cost', 'Who Has It'],
  },
  {
    entityType: 'item',
    label: 'Item / Prop',
    folder: 'World/Items',
    defaults: { canon_level: 'guidance' },
    sections: ['Description', 'Provenance', 'Current Holder', 'Continuity'],
  },
  {
    entityType: 'event',
    label: 'Historical Event',
    folder: 'World/History',
    defaults: { canon_level: 'guidance', date: '' },
    sections: ['What Happened', 'Causes', 'Consequences', 'Who Knows'],
  },
  {
    entityType: 'rule',
    label: 'Rule / Law of World',
    folder: 'World/Rules',
    defaults: { canon_level: 'locked' },
    sections: ['Statement', 'Limits', 'Exceptions', 'Implications'],
  },
  {
    entityType: 'theme',
    label: 'Theme / Motif',
    folder: 'World/Themes',
    defaults: { canon_level: 'guidance' },
    sections: ['Statement', 'Expressions', 'Counterpoint'],
  },
  {
    entityType: 'research',
    label: 'Research Note',
    folder: 'World/Research',
    defaults: {
      canon_level: 'inspiration',
      source_url: '',
      retrieved: '',
      confidence: 'unverified',
    },
    sections: ['Summary', 'Quotes', 'Open Questions'],
  },
];

export function templateFor(entityType: EntityType): EntityTemplate | undefined {
  return ENTITY_TEMPLATES.find((t) => t.entityType === entityType);
}

/** Filesystem-safe slug for filenames; never produces an empty string. */
export function slugify(title: string): string {
  const slug = title
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
  return slug === '' ? 'untitled' : slug;
}

/** Stable ID from type + title, e.g. `char_lan`. Never filename-derived. */
export function entityId(entityType: EntityType, title: string): string {
  const prefixes: Record<EntityType, string> = {
    character: 'char',
    location: 'loc',
    faction: 'fac',
    culture: 'cul',
    creature: 'cre',
    technology: 'tech',
    item: 'item',
    event: 'evt',
    rule: 'rule',
    theme: 'theme',
    research: 'res',
  };
  const base = slugify(title).toLowerCase().replace(/-/g, '_');
  return `${prefixes[entityType]}_${base}`;
}

export interface NewEntity {
  path: string;
  source: string;
}

/**
 * Render a new entity note from a template. `now` is injected rather than
 * read from the clock so callers stay deterministic and testable.
 */
export function createEntity(
  template: EntityTemplate,
  title: string,
  now: string,
  overrides: Record<string, unknown> = {},
): NewEntity {
  const frontmatter: Record<string, unknown> = {
    schema_version: 1,
    id: entityId(template.entityType, title),
    type: 'world_entity',
    entity_type: template.entityType,
    title,
    status: 'draft',
    created_at: now,
    updated_at: now,
    tags: [],
    aliases: [],
    ...template.defaults,
    ...overrides,
  };
  const body = [`# ${title}`, '', ...template.sections.flatMap((s) => [`## ${s}`, '', ''])].join(
    '\n',
  );
  return {
    path: `${template.folder}/${slugify(title)}.md`,
    source: renderFrontmatter(frontmatter) + body,
  };
}

function renderFrontmatter(frontmatter: Record<string, unknown>): string {
  const lines = Object.entries(frontmatter).map(([key, value]) => `${key}: ${renderValue(value)}`);
  return `---\n${lines.join('\n')}\n---\n`;
}

function renderValue(value: unknown): string {
  if (Array.isArray(value)) {
    return value.length === 0 ? '[]' : `[${value.map((v) => renderScalar(v)).join(', ')}]`;
  }
  return renderScalar(value);
}

function renderScalar(value: unknown): string {
  if (typeof value === 'string') {
    // Quote when YAML would otherwise misread the scalar.
    return /^[\w .'/-]*$/.test(value) && value.trim() === value && value !== ''
      ? value
      : JSON.stringify(value);
  }
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  // Objects and anything exotic go through JSON so we never emit
  // "[object Object]" into a user's frontmatter.
  return JSON.stringify(value);
}
