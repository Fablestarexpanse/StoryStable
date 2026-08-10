/**
 * Browser-safe schema validator. No filesystem access — schemas come from
 * the static `definitions` map, so this module works in the Tauri webview.
 */
import { Ajv2020 } from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { SCHEMA_FILES } from './definitions.js';

export interface ValidationIssue {
  /** JSON Pointer into the validated object ('' for the root). */
  path: string;
  message: string;
}

export class SchemaValidator {
  private readonly ajv: Ajv2020;

  constructor() {
    this.ajv = new Ajv2020({ allErrors: true, strict: true, allowUnionTypes: true });
    addFormats(this.ajv);
    for (const schema of Object.values(SCHEMA_FILES)) {
      const id = schema.$id;
      if (typeof id === 'string') this.ajv.addSchema(schema, id);
    }
  }

  /** Validate data against a schema urn. Returns [] when valid. */
  validate(schemaId: string, data: unknown): ValidationIssue[] {
    const validate = this.ajv.getSchema(schemaId);
    if (!validate) return [{ path: '', message: `unknown schema: ${schemaId}` }];
    if (validate(data)) return [];
    return (validate.errors ?? []).map((e) => ({
      path: e.instancePath,
      message: `${e.instancePath === '' ? 'object' : e.instancePath} ${e.message ?? 'is invalid'}`,
    }));
  }
}

let shared: SchemaValidator | null = null;

/** Lazily-created shared validator; compiling schemas is not free. */
export function sharedValidator(): SchemaValidator {
  shared ??= new SchemaValidator();
  return shared;
}
