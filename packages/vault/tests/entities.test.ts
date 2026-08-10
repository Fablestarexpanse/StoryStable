import { describe, expect, it } from 'vitest';
import { ENTITY_TEMPLATES, templateFor, createEntity, entityId, slugify } from '../src/entities.js';
import { parseFrontmatter, setFrontmatterValue } from '../src/frontmatter.js';
import { parseNote } from '../src/links.js';
import { SchemaValidator } from '@storystable/schemas/browser';

const NOW = '2026-08-09T13:00:00-07:00';

describe('slugify / entityId', () => {
  it('makes filesystem-safe slugs', () => {
    expect(slugify('Outer Ring')).toBe('Outer-Ring');
    expect(slugify('Lan: The Conduit?')).toBe('Lan-The-Conduit');
    expect(slugify('   ')).toBe('untitled');
  });

  it('derives stable ids from type and title, not filename', () => {
    expect(entityId('character', 'Lan')).toBe('char_lan');
    expect(entityId('location', 'Outer Ring')).toBe('loc_outer_ring');
    expect(entityId('rule', 'Salvage Law')).toBe('rule_salvage_law');
  });
});

describe('createEntity', () => {
  it('produces a note that parses back correctly', () => {
    const template = templateFor('character');
    if (!template) throw new Error('character template missing');
    const entity = createEntity(template, 'Lan', NOW);
    expect(entity.path).toBe('World/Characters/Lan.md');

    const parsed = parseFrontmatter(entity.source);
    expect(parsed.errors).toEqual([]);
    expect(parsed.frontmatter).toMatchObject({
      schema_version: 1,
      id: 'char_lan',
      type: 'world_entity',
      entity_type: 'character',
      title: 'Lan',
      status: 'draft',
      canon_level: 'guidance',
    });
    expect(parsed.body).toContain('# Lan');
    expect(parsed.body).toContain('## Continuity');
  });

  it('honours overrides', () => {
    const rule = templateFor('rule');
    if (!rule) throw new Error('rule template missing');
    const entity = createEntity(rule, 'Salvage Law', NOW, { status: 'canon' });
    expect(parseFrontmatter(entity.source).frontmatter.status).toBe('canon');
  });

  it('quotes values that would otherwise break YAML', () => {
    const character = templateFor('character');
    if (!character) throw new Error('character template missing');
    const entity = createEntity(character, 'Lan: The Conduit', NOW);
    const parsed = parseFrontmatter(entity.source);
    expect(parsed.errors).toEqual([]);
    expect(parsed.frontmatter.title).toBe('Lan: The Conduit');
  });

  it('every template yields a schema-valid world entity', () => {
    const validator = new SchemaValidator();
    for (const template of ENTITY_TEMPLATES) {
      const entity = createEntity(template, `Test ${template.label}`, NOW);
      const { frontmatter, errors } = parseFrontmatter(entity.source);
      expect(errors, template.label).toEqual([]);
      expect(
        validator.validate('urn:storystable:world-entity', frontmatter),
        template.label,
      ).toEqual([]);
    }
  });

  it('every template folder lives under World/', () => {
    for (const template of ENTITY_TEMPLATES) {
      expect(template.folder.startsWith('World/'), template.label).toBe(true);
    }
  });
});

describe('setFrontmatterValue', () => {
  const source = '---\ntitle: Lan\n# a comment\nstatus: draft\ntags: [a]\n---\n# Lan\n\nBody.\n';

  it('updates a value while preserving body, order and comments', () => {
    const out = setFrontmatterValue(source, 'status', 'canon');
    expect(out).toContain('# a comment');
    expect(out.indexOf('title:')).toBeLessThan(out.indexOf('status:'));
    const parsed = parseFrontmatter(out);
    expect(parsed.frontmatter.status).toBe('canon');
    expect(parsed.frontmatter.title).toBe('Lan');
    expect(parsed.body).toBe('# Lan\n\nBody.\n');
  });

  it('adds a new key', () => {
    const parsed = parseFrontmatter(setFrontmatterValue(source, 'canon_level', 'locked'));
    expect(parsed.frontmatter.canon_level).toBe('locked');
  });

  it('removes a key when the value is undefined', () => {
    const parsed = parseFrontmatter(setFrontmatterValue(source, 'status', undefined));
    expect(parsed.frontmatter).not.toHaveProperty('status');
    expect(parsed.frontmatter.title).toBe('Lan');
  });

  it('adds a frontmatter block to a note that has none', () => {
    const out = setFrontmatterValue('# Plain\n\nBody', 'title', 'Plain');
    const parsed = parseFrontmatter(out);
    expect(parsed.frontmatter.title).toBe('Plain');
    expect(parsed.body).toBe('# Plain\n\nBody');
  });

  it('handles array values', () => {
    const parsed = parseFrontmatter(setFrontmatterValue(source, 'tags', ['x', 'y']));
    expect(parsed.frontmatter.tags).toEqual(['x', 'y']);
  });

  it('round-trips through parseNote', () => {
    const updated = setFrontmatterValue(source, 'status', 'canon');
    const note = parseNote({ path: 'World/Characters/Lan.md', source: updated });
    expect(note.frontmatter.status).toBe('canon');
    expect(note.title).toBe('Lan');
  });
});
