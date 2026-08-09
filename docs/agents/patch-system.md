# Patch System

All consequential AI writes are `AgentPatch` objects: target file + base hash,
proposed operations (unified diff), rationale, checks, and status. A patch
whose target hash changed since proposal is stale and must be rebased, never
blindly applied. Bulk agent edits group into one reversible transaction from
the user point of view.

Schema: `packages/schemas/schemas/agent-patch.schema.json`.
Implementation arrives in Phase 3.
