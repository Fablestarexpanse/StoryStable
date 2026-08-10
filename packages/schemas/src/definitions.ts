/**
 * Static schema imports so the schema registry works inside the webview,
 * where `fs` is unavailable. `registry.ts` keeps the filesystem-backed
 * loader for node contexts (CLI, tests).
 *
 * A test asserts this list never drifts from the `schemas/` directory —
 * adding a schema file without registering it here fails CI.
 */
import agentPatch from '../schemas/agent-patch.schema.json' with { type: 'json' };
import assemblyClip from '../schemas/assembly-clip.schema.json' with { type: 'json' };
import boardPanel from '../schemas/board-panel.schema.json' with { type: 'json' };
import common from '../schemas/common.schema.json' with { type: 'json' };
import generationPacket from '../schemas/generation-packet.schema.json' with { type: 'json' };
import moment from '../schemas/moment.schema.json' with { type: 'json' };
import referenceSet from '../schemas/reference-set.schema.json' with { type: 'json' };
import renderJob from '../schemas/render-job.schema.json' with { type: 'json' };
import scene from '../schemas/scene.schema.json' with { type: 'json' };
import shot from '../schemas/shot.schema.json' with { type: 'json' };
import stateSnapshot from '../schemas/state-snapshot.schema.json' with { type: 'json' };
import take from '../schemas/take.schema.json' with { type: 'json' };
import worldEntity from '../schemas/world-entity.schema.json' with { type: 'json' };

export const SCHEMA_FILES: Readonly<Record<string, Record<string, unknown>>> = {
  'agent-patch.schema.json': agentPatch,
  'assembly-clip.schema.json': assemblyClip,
  'board-panel.schema.json': boardPanel,
  'common.schema.json': common,
  'generation-packet.schema.json': generationPacket,
  'moment.schema.json': moment,
  'reference-set.schema.json': referenceSet,
  'render-job.schema.json': renderJob,
  'scene.schema.json': scene,
  'shot.schema.json': shot,
  'state-snapshot.schema.json': stateSnapshot,
  'take.schema.json': take,
  'world-entity.schema.json': worldEntity,
};

export const WORLD_ENTITY_SCHEMA_ID = 'urn:storystable:world-entity';
