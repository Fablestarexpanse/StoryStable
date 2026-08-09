/**
 * Schema validation gate, run by `npm run schema:validate`.
 * Fails (exit 1) if any schema fails to compile, any valid fixture is
 * rejected, or any invalid fixture is accepted.
 */
import { SchemaRegistry, loadFixtures } from './registry.js';

let failures = 0;
const fail = (msg: string) => {
  failures += 1;
  console.error(`FAIL ${msg}`);
};

const registry = new SchemaRegistry();
const compiled = registry.compileAll();
console.log(`compiled ${String(compiled.size)} schemas`);

for (const fixture of loadFixtures('valid')) {
  const { valid, errors } = registry.validate(fixture.schemaId, fixture.data);
  if (valid) console.log(`ok   ${fixture.file}`);
  else fail(`${fixture.file} should validate against ${fixture.schemaId}:\n${errors}`);
}

for (const fixture of loadFixtures('invalid')) {
  const { valid } = registry.validate(fixture.schemaId, fixture.data);
  if (!valid) console.log(`ok   ${fixture.file} (correctly rejected)`);
  else fail(`${fixture.file} should be REJECTED by ${fixture.schemaId} but validated`);
}

if (failures > 0) {
  console.error(`\n${String(failures)} failure(s)`);
  process.exit(1);
}
console.log('\nschema validation passed');
