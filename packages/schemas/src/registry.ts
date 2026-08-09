import { readdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Ajv2020, type ValidateFunction } from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const here = dirname(fileURLToPath(import.meta.url));
export const schemasDir = join(here, '..', 'schemas');
export const fixturesDir = join(here, '..', 'fixtures');

export interface SchemaFile {
  file: string;
  id: string;
  schema: Record<string, unknown>;
}

export function loadSchemaFiles(): SchemaFile[] {
  return readdirSync(schemasDir)
    .filter((f) => f.endsWith('.schema.json'))
    .sort()
    .map((file) => {
      const schema = JSON.parse(readFileSync(join(schemasDir, file), 'utf-8')) as Record<
        string,
        unknown
      >;
      const id = schema.$id;
      if (typeof id !== 'string' || !id.startsWith('urn:storystable:')) {
        throw new Error(`${file}: $id must be a urn:storystable:* string`);
      }
      return { file, id, schema };
    });
}

/** Required metadata per spec section 4: $schema, $id, title, description. */
export function assertSchemaMetadata(entry: SchemaFile): void {
  const { file, schema } = entry;
  if (schema.$schema !== 'https://json-schema.org/draft/2020-12/schema') {
    throw new Error(`${file}: $schema must declare JSON Schema 2020-12`);
  }
  for (const key of ['title', 'description'] as const) {
    if (typeof schema[key] !== 'string' || schema[key].length === 0) {
      throw new Error(`${file}: missing ${key}`);
    }
  }
}

export class SchemaRegistry {
  readonly ajv: Ajv2020;
  readonly entries: SchemaFile[];

  constructor() {
    // strict mode on; union type arrays (e.g. state values string|number|boolean|null) are intentional
    this.ajv = new Ajv2020({ allErrors: true, strict: true, allowUnionTypes: true });
    addFormats(this.ajv);
    this.entries = loadSchemaFiles();
    for (const entry of this.entries) {
      assertSchemaMetadata(entry);
      this.ajv.addSchema(entry.schema, entry.id);
    }
  }

  /** Compiles every registered schema, resolving all internal $refs. Throws on any failure. */
  compileAll(): Map<string, ValidateFunction> {
    const compiled = new Map<string, ValidateFunction>();
    for (const entry of this.entries) {
      const validate = this.ajv.getSchema(entry.id);
      if (!validate) throw new Error(`${entry.file}: failed to compile ${entry.id}`);
      compiled.set(entry.id, validate);
    }
    return compiled;
  }

  validate(schemaId: string, data: unknown): { valid: boolean; errors: string } {
    const validate = this.ajv.getSchema(schemaId);
    if (!validate) throw new Error(`unknown schema: ${schemaId}`);
    const valid = validate(data) as boolean;
    return { valid, errors: this.ajv.errorsText(validate.errors, { separator: '\n' }) };
  }
}

export interface Fixture {
  file: string;
  /** Schema urn the fixture targets, from its `$comment_schema` key. */
  schemaId: string;
  data: unknown;
}

export function loadFixtures(kind: 'valid' | 'invalid'): Fixture[] {
  const dir = join(fixturesDir, kind);
  return readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((file) => {
      const raw = JSON.parse(readFileSync(join(dir, file), 'utf-8')) as {
        $schema_id: string;
        data: unknown;
      };
      if (typeof raw.$schema_id !== 'string') {
        throw new Error(`${kind}/${file}: fixture must declare $schema_id`);
      }
      return { file: `${kind}/${file}`, schemaId: raw.$schema_id, data: raw.data };
    });
}
