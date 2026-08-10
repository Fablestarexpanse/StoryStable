/**
 * Browser-safe entry point. Deliberately excludes `registry.ts`, which
 * reads the filesystem and cannot load in the webview.
 */
export { SchemaValidator, sharedValidator } from './validator.js';
export type { ValidationIssue } from './validator.js';
export { SCHEMA_FILES, WORLD_ENTITY_SCHEMA_ID } from './definitions.js';
