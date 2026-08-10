import { describe, expect, it } from 'vitest';
import {
  SchemaRegistry,
  loadSchemaFiles,
  loadFixtures,
  assertSchemaMetadata,
} from '../src/registry.js';
import { SCHEMA_FILES } from '../src/definitions.js';
import { SchemaValidator } from '../src/validator.js';

const registry = new SchemaRegistry();

describe('schema contracts', () => {
  it('every schema declares 2020-12, a urn $id, title, and description', () => {
    const files = loadSchemaFiles();
    expect(files.length).toBeGreaterThanOrEqual(13);
    for (const entry of files) {
      expect(() => {
        assertSchemaMetadata(entry);
      }).not.toThrow();
    }
  });

  it('all schemas compile and all internal $refs resolve', () => {
    const compiled = registry.compileAll();
    expect(compiled.size).toBe(loadSchemaFiles().length);
  });

  it('every object schema has at least one valid fixture', () => {
    const objectSchemas = registry.entries.filter((e) => e.id !== 'urn:storystable:common');
    const fixtureTargets = new Set(loadFixtures('valid').map((f) => f.schemaId));
    for (const schema of objectSchemas) {
      expect(fixtureTargets, `no valid fixture for ${schema.id}`).toContain(schema.id);
    }
  });
});

describe('valid fixtures', () => {
  for (const fixture of loadFixtures('valid')) {
    it(`${fixture.file} validates against ${fixture.schemaId}`, () => {
      const { valid, errors } = registry.validate(fixture.schemaId, fixture.data);
      expect(valid, errors).toBe(true);
    });
  }
});

describe('invalid fixtures', () => {
  for (const fixture of loadFixtures('invalid')) {
    it(`${fixture.file} is rejected by ${fixture.schemaId}`, () => {
      const { valid } = registry.validate(fixture.schemaId, fixture.data);
      expect(valid).toBe(false);
    });
  }
});

describe('browser definitions', () => {
  it('static schema list matches the schemas directory exactly', () => {
    const onDisk = loadSchemaFiles()
      .map((e) => e.file)
      .sort();
    expect(Object.keys(SCHEMA_FILES).sort()).toEqual(onDisk);
  });

  it('statically imported content matches the files on disk', () => {
    for (const entry of loadSchemaFiles()) {
      expect(SCHEMA_FILES[entry.file], `${entry.file} content drift`).toEqual(entry.schema);
    }
  });

  it('browser validator agrees with the fs-backed registry', () => {
    const validator = new SchemaValidator();
    for (const fixture of loadFixtures('valid')) {
      expect(validator.validate(fixture.schemaId, fixture.data), fixture.file).toEqual([]);
    }
    for (const fixture of loadFixtures('invalid')) {
      expect(
        validator.validate(fixture.schemaId, fixture.data).length,
        fixture.file,
      ).toBeGreaterThan(0);
    }
  });

  it('reports the failing property path', () => {
    const issues = new SchemaValidator().validate('urn:storystable:world-entity', {
      schema_version: 1,
      id: 'char_x',
      type: 'world_entity',
      entity_type: 'not_a_real_type',
      title: 'X',
      status: 'canon',
    });
    expect(issues.some((i) => i.path === '/entity_type')).toBe(true);
  });
});

describe('contract-critical rules', () => {
  it('rejects v0.1-style authority values (ADR-0001)', () => {
    for (const legacy of ['motion_only', 'voice_only']) {
      const { valid } = registry.validate('urn:storystable:reference-set', {
        schema_version: 1,
        id: 'refset_x',
        type: 'reference_set',
        title: 'x',
        entries: [{ asset_id: 'vid_x', role: 'motion', authority: legacy }],
      });
      expect(valid, `authority "${legacy}" must be rejected`).toBe(false);
    }
  });

  it('accepts the same intent expressed as authority + use_scope', () => {
    const { valid, errors } = registry.validate('urn:storystable:reference-set', {
      schema_version: 1,
      id: 'refset_x',
      type: 'reference_set',
      title: 'x',
      entries: [
        { asset_id: 'vid_x', role: 'motion', authority: 'strong', use_scope: 'motion_only' },
      ],
    });
    expect(valid, errors).toBe(true);
  });

  it('board panel duration requires exact frames and rational rate', () => {
    const base = {
      schema_version: 1,
      id: 'board_x',
      type: 'board_panel',
      scene_id: 'scene_x',
      moment_id: 'moment_x',
      order: 0,
      status: 'sketch',
    };
    expect(
      registry.validate('urn:storystable:board-panel', {
        ...base,
        duration: { seconds: 3.0 },
      }).valid,
      'float-seconds duration must be rejected',
    ).toBe(false);
    expect(
      registry.validate('urn:storystable:board-panel', {
        ...base,
        duration: { frames: 72, rate: { numerator: 24, denominator: 1 } },
      }).valid,
    ).toBe(true);
  });

  it('state snapshot never collapses truth and knowledge', () => {
    const { valid } = registry.validate('urn:storystable:state-snapshot', {
      schema_version: 1,
      id: 'state_x',
      type: 'state_snapshot',
      story_position: { scene_id: 'scene_x', phase: 'end' },
      world_state: {},
    });
    expect(valid, 'knowledge field must be required').toBe(false);
  });
});
