# AI-Native Animation & Worldbuilding Production OS
## Master Build Specification v0.1

> Working document intended for a coding agent. Product name is deliberately left open.

---

## 0. Purpose

Build a local-first desktop production environment for worldbuilding, writing, visual development, generative image/video production, and short-film assembly.

The application is **not** a traditional NLE with AI bolted on and is **not** a replacement for ComfyUI. It is the durable production layer above models and renderers.

The product should let a creator move continuously through:

**World → Story → Scene → Moment → Shot → References → Generation → Takes → Assembly → Export**

The durable project is human-readable Markdown/YAML/JSON + media. SQLite is an index/cache. ComfyUI is a render backend. LLMs are replaceable assistants. MiniMax H3 is the first-class video renderer, but renderer-specific syntax must never become the project’s source of truth.

---

# 1. Non-Negotiable Product Principles

1. **Files are the source of truth.**
   - Canon, story, scenes, production objects, and project configuration must be recoverable from project files.
   - SQLite may index/cache them but must be rebuildable.

2. **Markdown-first worldbuilding.**
   - World notes are ordinary `.md` files with YAML frontmatter.
   - Wikilinks/backlinks are first-class.
   - The project should remain intelligible in another Markdown editor.

3. **Open interchange where practical.**
   - Markdown/YAML for authored knowledge.
   - JSON Schema 2020-12 for validation contracts.
   - JSON Canvas-compatible canvas files where possible.
   - OpenTimelineIO for editorial interchange.
   - Standard media files; never hide core media inside a proprietary database.

4. **Production intent is renderer-neutral.**
   - Store camera, performance, dialogue, sound, state, purpose, and reference roles.
   - Compile those into H3/ComfyUI/model-specific prompts only at render time.

5. **H3 is first-class, not hard-coded into the domain.**
   - H3 receives the richest adapter/compiler initially.
   - Future renderers should plug into the same `GenerationPacket` contract.

6. **LLMs propose; users own canon.**
   - Agents may read and analyze freely within granted scope.
   - Writes must use explicit patch/proposal mechanisms unless the user has enabled a clearly scoped auto-apply mode.
   - Canon must never change silently.

7. **Every important output has lineage.**
   - A take must know what scene/moment/shot, references, model, workflow, prompt compiler version, settings, and source assets created it.

8. **No destructive magic.**
   - Never silently delete original media.
   - Never overwrite an approved/canon asset without versioning.
   - Never silently send local/private project content to a cloud provider.

9. **UI is task-oriented.**
   - Users work in filmmaking/worldbuilding concepts.
   - ComfyUI node IDs, provider payloads, H3 reference numbering, and prompt syntax are adapter details unless the user explicitly opens advanced mode.

10. **Documentation is part of the code.**
    - A behavior change is incomplete until its documentation, tests, schema/version implications, and changelog/ADR requirements are handled.

---

# 2. Primary Workspaces

Keep the top-level application simple:

1. **WORLD** — knowledge, canon, timelines, relationships, research, references.
2. **STORY** — outline, sequences, screenplay, scene state, beats, moments, branches.
3. **STUDIO** — visual development, boards, shot planning, references, image/video/audio generation, takes.
4. **CUT** — animatic, edit, sound placement, review, version switching, export.

Persistent global surfaces:

- Command palette
- Search
- Library
- Render queue
- Agents/context inspector
- Notifications/problems
- Project health

Do not turn Library, Agents, Queue, Settings, or References into equal top-level workspaces unless user testing later proves necessary.

---

# 3. Project Folder Layout

```text
ProjectName/
├── project.yaml
├── README.md
│
├── World/
│   ├── Characters/
│   ├── Locations/
│   ├── Factions/
│   ├── Cultures/
│   ├── Creatures/
│   ├── Technology/
│   ├── Items/
│   ├── History/
│   ├── Rules/
│   ├── Themes/
│   └── Research/
│
├── Story/
│   ├── Premise.md
│   ├── Outline.md
│   ├── Sequences/
│   ├── Scenes/
│   └── Branches/
│
├── Production/
│   ├── Moments/
│   ├── Shots/
│   ├── ReferenceSets/
│   ├── GenerationPackets/
│   ├── Takes/
│   ├── Reviews/
│   └── StateSnapshots/
│
├── Canvases/
├── References/
│   ├── Character/
│   ├── Environment/
│   ├── Style/
│   ├── Costume/
│   ├── Props/
│   ├── Motion/
│   ├── Camera/
│   └── Voice/
│
├── Media/
│   ├── Images/
│   ├── Video/
│   ├── Audio/
│   ├── Proxies/
│   └── Thumbnails/
│
├── Edit/
│   ├── master.otio
│   ├── autosaves/
│   └── exports/
│
└── .project/
    ├── index.sqlite
    ├── cache/
    ├── schemas/
    ├── workflows/
    ├── workflow-adapters/
    ├── prompts/
    ├── migrations/
    ├── logs/
    └── locks/
```

Rules:

- User-authored durable content should live outside `.project/` whenever possible.
- `.project/index.sqlite` is disposable/rebuildable.
- Secrets never live inside the project folder.
- Generated originals are immutable after ingestion; edits create descendants.
- Paths stored in project objects should be relative to the project root unless referencing an explicitly external asset.

---

# 4. Schema Strategy

Use **JSON Schema 2020-12** as the canonical validation contract for structured data.

Rules:

- Every schema has `$schema`, `$id`, `title`, `description`, and `schema_version`.
- Shared objects are defined once under `$defs` and reused with `$ref`.
- TypeScript types are generated from schemas or validated at boundaries; do not maintain two drifting definitions by hand.
- YAML frontmatter is parsed and validated against the same schema family.
- Unknown future fields should be handled deliberately. Prefer `additionalProperties: false` for internal machine objects and more permissive frontmatter only where extension is intentional.
- Schema migrations must be explicit, versioned, tested, reversible when practical, and performed on a backup/copy before destructive transformations.

Base metadata for durable objects:

```yaml
schema_version: 1
id: <stable-uuid-or-project-id>
type: <object-type>
title: <human-title>
status: draft
created_at: 2026-08-09T13:00:00-07:00
updated_at: 2026-08-09T13:00:00-07:00
tags: []
aliases: []
```

Stable IDs must not depend on filenames. Renaming a note must not break identity.

---

# 5. Production Object Model

## 5.1 WorldEntity

A world note is Markdown plus validated frontmatter.

Supported initial subtypes:

- character
- location
- faction
- culture
- creature
- technology
- item
- event
- rule
- theme
- concept
- research

Example:

```yaml
---
schema_version: 1
id: char_lan
type: world_entity
entity_type: character
title: Lan
status: canon
canon_level: locked
aliases: []
tags: [conduit, protagonist]
relationships:
  - target_id: char_mira
    relation: ally
    status: current
first_appearance: scene_001
---
```

Body remains normal Markdown.

Required behaviors:

- backlinks
- outgoing links
- unlinked mentions
- property views
- graph participation
- timeline references
- scene appearances
- reference assets
- canon/conflict indicators
- change history

## 5.2 StateSnapshot

Represents what is physically true and what specific observers know at a story point.

```yaml
schema_version: 1
id: state_scene_014_end
type: state_snapshot
story_position:
  scene_id: scene_014
  phase: end
world_state:
  char_lan:
    left_hand: burned
    coat: torn
  ship_01:
    port_viewport: cracked
    reactor_percent: 71
knowledge:
  char_lan:
    fablestar_recognizes_him: true
    builders_identity: unknown
  audience:
    fablestar_recognizes_lan: true
    builders_identity: unknown
```

This is a major feature. Never collapse world truth, character knowledge, and audience knowledge into one field.

## 5.3 Scene

```yaml
schema_version: 1
id: scene_014
type: scene
title: First Recognition
sequence_id: seq_01
order: 14
status: drafting
location_ids: [loc_outer_ring]
character_ids: [char_lan]
intent: "Lan realizes physical Fablestar recognizes him."
start_state_id: state_scene_014_start
end_state_id: state_scene_014_end
emotional_arc:
  from: confidence
  through: recognition
  to: suppressed_fear
protected_information:
  - builders_identity
reveals:
  audience:
    - fablestar_recognizes_lan
  characters:
    char_lan:
      - fablestar_recognizes_him
moment_ids:
  - moment_014_01
  - moment_014_02
branch_of: null
```

Scene body may contain screenplay text, notes, and links.

## 5.4 Moment

A narrative/visual unit before a shot exists.

```yaml
schema_version: 1
id: moment_014_02
type: moment
scene_id: scene_014
order: 2
status: approved
purpose: "Lan understands that the response is specific to his ship."
required_information:
  - "The response is intentional."
  - "Lan notices before he says anything."
emotional_turn:
  from: recognition
  to: suppressed_fear
state_changes:
  - path: knowledge.char_lan.fablestar_recognizes_him
    from: false
    to: true
visual_options:
  - "Cockpit reflection"
  - "Instrument change before visible movement"
  - "Debris pivots subtly"
shot_ids: []
```

## 5.5 Shot

The renderer-neutral production intent object.

```yaml
schema_version: 1
id: shot_014_020
type: shot
scene_id: scene_014
moment_id: moment_014_02
order: 20
status: board_approved
purpose: "Lan realizes the structure is reacting specifically to him."

duration:
  target_seconds: 8.0
  hard_max_seconds: null

composition:
  shot_size: medium_close_up
  angle: eye_level
  aspect_ratio: "16:9"
  lens_mm: null

camera:
  movement: push_in
  amplitude: small
  speed: slow
  stabilization: controlled
  notes: "No handheld shake."

performance:
  character_id: char_lan
  intention: "Hide fear; keep watching."
  action_beats:
    - "notices structural movement"
    - "freezes briefly"
    - "eyes shift to instruments"
  expression: restrained
  body_language: closed

visual:
  environment_id: loc_ship_cockpit
  lighting: "existing cockpit lighting"
  continuity_notes: []

dialogue: []

sound:
  ambience:
    - "low ship machinery"
  sfx:
    - "distant structural groan"
    - "single warning tone"
  music:
    mode: none

keyframes:
  first_frame_asset_id: null
  last_frame_asset_id: null

reference_set_id: refset_shot_014_020
renderer:
  preferred: minimax_h3
  mode_hint: auto
  profile: production
```

Never store the H3 prompt as the canonical shot description.

## 5.6 ReferenceSet

```yaml
schema_version: 1
id: refset_shot_014_020
type: reference_set
title: "Lan Recognition Shot"
entries:
  - asset_id: img_lan_identity_04
    role: identity
    authority: locked
    target_entity_id: char_lan
    priority: 100
    notes: "Face identity only."

  - asset_id: img_lan_approach_costume_02
    role: costume
    authority: locked
    target_entity_id: char_lan
    priority: 95

  - asset_id: img_cockpit_03
    role: environment
    authority: guidance
    target_entity_id: loc_ship_cockpit
    priority: 70

  - asset_id: vid_camera_push_02
    role: camera_motion
    authority: motion_only
    priority: 60

  - asset_id: wav_lan_voice_master
    role: voice
    authority: locked
    target_entity_id: char_lan
    priority: 100
```

Initial roles:

- identity
- body
- costume
- prop
- environment
- style
- composition
- first_frame
- last_frame
- motion
- camera_motion
- expression
- pose
- voice
- music_style
- sound_reference

Authority values:

- locked
- strong
- guidance
- inspiration
- motion_only
- voice_only

## 5.7 GenerationPacket

Immutable render request after submission.

```yaml
schema_version: 1
id: genpkt_014_020_v003
type: generation_packet
shot_id: shot_014_020
created_at: 2026-08-09T13:00:00-07:00
source_revision_hash: sha256:...
compiler:
  id: h3_director
  version: 0.1.0
renderer:
  id: minimax_h3
  adapter_version: 0.1.0
  mode: ref2va
  model_family: ref2va
workflow:
  adapter_id: comfy_h3_ref2va
  adapter_version: 0.1.0
  workflow_hash: sha256:...
requested:
  duration_seconds: 8.0
  aspect_ratio: "16:9"
effective:
  frames: 192
  duration_seconds: 8.0
  width: 1344
  height: 768
references:
  pictures: []
  videos: []
  audios: []
compiled_prompt: "..."
settings: {}
```

Exact effective values are adapter-generated and must reflect what was actually submitted, not what was requested.

## 5.8 RenderJob

```yaml
schema_version: 1
id: renderjob_...
type: render_job
generation_packet_id: genpkt_...
backend: comfyui
backend_job_id: <prompt_id>
status: queued
progress:
  node_id: null
  value: 0
  max: 0
queued_at: ...
started_at: null
finished_at: null
cancel_requested: false
error: null
```

Allowed states:

`created → queued → running → succeeded | failed | cancelled | interrupted`

State transitions must be validated.

## 5.9 Take

```yaml
schema_version: 1
id: take_014_020_003
type: take
shot_id: shot_014_020
generation_packet_id: genpkt_014_020_v003
render_job_id: renderjob_...
status: candidate
files:
  video: Media/Video/take_014_020_003.mp4
  audio: null
  thumbnail: Media/Thumbnails/take_014_020_003.webp
lineage:
  parent_take_id: null
  continuation_of_take_id: null
review:
  rating: null
  decision: hold
  notes: []
qc:
  duration_ok: true
  resolution_ok: true
  audio_present: true
  identity_review: pending
```

Decisions:

- rejected
- hold
- candidate
- approved
- final

Approval must never destroy rejected/previous takes.

## 5.10 AssemblyClip

```yaml
schema_version: 1
id: clip_master_0017
type: assembly_clip
sequence_id: edit_master
shot_id: shot_014_020
take_id: take_014_020_003
track: V1
source_range:
  start_seconds: 0.0
  duration_seconds: 7.75
timeline_range:
  start_seconds: 42.5
  duration_seconds: 7.75
audio:
  enabled: true
  gain_db: 0
transition_in: null
transition_out: null
markers: []
```

The master edit should serialize to OTIO plus application-specific metadata sidecars as needed.

## 5.11 AgentPatch

All consequential AI writes should be representable as a reviewable patch.

```yaml
schema_version: 1
id: patch_...
type: agent_patch
agent_id: canon_keeper
model_route: local_first
targets:
  - path: World/Characters/Lan.md
    before_hash: sha256:...
changes:
  format: unified_diff
  payload: "..."
rationale: "..."
checks:
  schema_validation: passed
  link_validation: passed
  continuity_check: passed
  tests: not_applicable
docs_impact: none
status: proposed
```

A patch must fail safely if the target hash has changed since the proposal was created; require regeneration/rebase rather than blindly applying stale edits.

---

# 6. MiniMax H3 Compiler Contract

## 6.1 Goal

Convert renderer-neutral `Shot + StateSnapshot + ReferenceSet + project style/canon context` into a valid H3 generation request without forcing the creator to manage H3 syntax manually.

## 6.2 Inputs

```text
H3CompileRequest
├── shot
├── scene
├── moment
├── state_snapshot
├── reference_set
├── selected_board/keyframes
├── project_visual_rules
├── dialogue source text
├── profile (preview|production|custom)
└── capability profile from installed/current H3 adapter
```

## 6.3 Output

```text
H3CompileResult
├── selected_mode
├── model_family
├── requested_duration
├── effective_frames
├── effective_duration
├── width/height
├── ordered_picture_inputs
├── ordered_video_inputs
├── ordered_audio_inputs
├── prompt_sections
├── final_prompt
├── warnings
├── blocking_errors
└── reproducibility metadata
```

## 6.4 Automatic Mode Router

Default logic:

1. If non-keyframe multimodal references are required (identity/style/motion/camera/voice/audio/etc.) → `R2V/ref2va`.
2. Else if first + last frame are present → `FL2VA`.
3. Else if first frame is present → `I2VA`.
4. Else if last frame only and installed adapter supports it → `L2VA`.
5. Else → `T2VA`.

The user may override the router, but preflight must explain incompatible settings.

## 6.5 H3 Duration Handling

Never let UI duration and actual H3 duration diverge silently.

The H3 adapter owns a capability function:

```ts
getAllowedFrameCount(targetSeconds: number): {
  frames: number;
  seconds: number;
  deltaSeconds: number;
}
```

For the current H3 family, allowed duration must honor its 24fps frame/block grid. The capability is versioned in the adapter rather than scattered through UI code.

The UI displays:

```text
Requested: 8.00s
H3 effective: 8.04s
Difference: +0.04s
```

before queueing.

## 6.6 Resolution Handling

The H3 adapter must:

- calculate width/height from aspect ratio + quality profile
- honor the model’s required resolution multiple
- show estimated resource impact
- separate `preview` from `production` profiles
- never upscale a preview silently and label it “native”

## 6.7 Reference Resolver

The creator chooses semantic roles; the resolver chooses H3 ordering.

Example internal result:

```yaml
pictures:
  - tag: "<Picture 1>"
    asset_id: img_lan_identity_04
    roles: [identity]
  - tag: "<Picture 2>"
    asset_id: img_cockpit_03
    roles: [environment]
videos:
  - tag: "<Video 1>"
    asset_id: vid_camera_push_02
    roles: [camera_motion]
audios:
  - tag: "<Audio 1>"
    asset_id: wav_lan_voice_master
    roles: [voice]
```

Rules:

- Input numbering is generated from actual connection order.
- Prompt tags are generated from that numbering; users should never hand-maintain tag numbers.
- When an asset is removed/reordered, regenerate all tags atomically.
- Reference role text should explicitly state what to copy and what not to copy when relevant.
- If the same subject is defined by multiple assets, the compiler should treat the subject as one conceptual subject with multiple source roles.

## 6.8 Base Prompt Compiler

For T2VA/I2VA/FL2VA/L2VA, generate:

```text
[optional keyframe alignment instruction]

integrated_multimodal_description: ...
overall_soundscape: ...
non_diegetic_music: ...
```

Compiler rules:

- Use sequential shot IDs.
- Preserve user-authored dialogue exactly unless the user explicitly asks to rewrite dialogue.
- Keep stable speaker IDs across cuts.
- Treat voiceover explicitly and preserve closed-lip intent when a character is visible.
- Camera instructions are natural actions, not a keyword dump.
- Prefer camera movement instead of unnecessary cuts when only distance/angle changes.
- Soundscape excludes dialogue already present in the shot body.
- Non-diegetic music is separate from in-world music.
- Keyframe modes describe the **motion path between states**, not two static image descriptions.

## 6.9 Full-Reference Prompt Compiler

For R2V/ref2va, internally represent the official concepts:

1. subject definitions
2. summary
3. retention analysis
4. detailed description
5. overall soundscape
6. non-diegetic music

The creator does not need to write these sections manually.

The compiler should make it possible to inspect each section in an “Advanced H3” panel.

## 6.10 H3 Preflight

Before queueing, validate against the active H3 capability profile:

- mode availability
- reference counts by media type
- valid reference ordering
- reference file readability
- duration constraints
- frame-grid compatibility
- resolution/multiple constraints
- first/last frame dimensions
- standalone-audio validity
- workflow adapter compatibility
- required model files/custom nodes present
- free disk space threshold
- estimated VRAM/RAM profile when available

Preflight result:

```text
READY
✓ duration
✓ resolution
✓ identity reference
✓ voice reference
✓ workflow
! camera reference is 27s; adapter will use configured allowed range
```

or block queueing with a precise corrective action.

## 6.11 Queue Optimization

The scheduler should understand model families and expensive swaps.

Batch/order jobs by compatible model family where possible, while preserving explicit user priority.

Never secretly reorder a user-marked urgent render behind optimization rules.

## 6.12 Continuation

`Continue Take` should:

1. select/extract an appropriate final clean frame
2. create the next linked shot or continuation unit
3. inherit relevant scene state
4. inherit reference set unless overridden
5. inherit style/environment/character continuity
6. allow new end-frame target
7. compile a new packet
8. link lineage using `continuation_of_take_id`

Continuation is a workflow operation, not a filename trick.

---

# 7. ComfyUI Workflow Adapter Contract

ComfyUI remains an external/sidecar render engine.

## 7.1 Adapter File

```yaml
schema_version: 1
id: comfy_h3_ref2va
version: 0.1.0
name: MiniMax H3 Reference Video
backend: comfyui
renderer: minimax_h3
supported_modes: [ref2va]
workflow_file: h3_reference_video_api.json
workflow_hash: sha256:...
requirements:
  comfyui_min_version: "0.30.0"
  models: []
  custom_nodes: []
inputs:
  prompt:
    node_id: "37"
    field: text
  width:
    node_id: "12"
    field: width
  height:
    node_id: "12"
    field: height
  duration:
    node_id: "45"
    field: seconds
  picture_1:
    node_id: "24"
    field: image
outputs:
  video:
    node_id: "81"
    output_key: videos
```

## 7.2 Adapter Rules

- Adapters are versioned independently of app releases.
- Workflow JSON hash is stored in every `GenerationPacket`.
- Never identify workflow inputs by label text alone; adapters map semantic inputs to exact node/field contracts.
- Validate adapter maps against the loaded workflow before allowing use.
- If a workflow changes and mappings break, mark adapter `incompatible` rather than guessing.
- Imported adapters are `untrusted` until inspected/approved because workflows/custom nodes can imply executable code dependencies.

## 7.3 Backend Interface

```ts
interface RenderBackend {
  probe(): Promise<BackendCapabilities>;
  validate(packet: GenerationPacket): Promise<ValidationResult>;
  submit(packet: GenerationPacket): Promise<BackendJobRef>;
  subscribe(job: BackendJobRef, cb: ProgressCallback): Unsubscribe;
  cancel(job: BackendJobRef): Promise<void>;
  getResult(job: BackendJobRef): Promise<RenderResult>;
  freeResources?(scope?: ResourceScope): Promise<void>;
}
```

ComfyUI-specific code must stay behind this boundary.

---

# 8. LLM / Agent Architecture

## 8.1 Model Gateway

Supported provider families initially:

- OpenAI
- Anthropic
- OpenRouter
- Ollama
- LM Studio
- Generic OpenAI-compatible

Do not make agent identity equal model identity.

```text
Agent → Capability Request → Routing Policy → Provider/Model
```

Routing profiles:

- Local Only
- Local First
- Balanced
- Best Quality
- Custom

Cloud fallback must never occur silently when privacy mode disallows it.

## 8.2 Agent Definitions

Initial agents:

- Writing Partner
- World Architect
- Canon Keeper
- Character Director
- Continuity Supervisor
- Visual Director
- Shot Designer
- Prompt Compiler
- Librarian
- Production Assistant

Agents are configurations of:

- system instructions
- allowed tools
- context policy
- write permissions
- preferred capabilities
- fallback routes
- temperature/reasoning defaults

## 8.3 Context Inspector

For every agent request, the UI can show:

```text
Context included
✓ active scene
✓ Lan
✓ Mira
✓ location
✓ previous scene
✓ current state snapshot
✓ relevant world rules
✓ selected references

Excluded
○ unrelated lore
○ rejected branches
○ private research notes
```

Users must be able to inspect/edit the context set.

## 8.4 Tool Risk Levels

Each agent tool is annotated in our internal registry:

- `read_only`
- `writes_project`
- `destructive`
- `external_network`
- `cost_incurring`
- `executes_code`

Default policy:

- read-only: may run automatically
- project write: propose patch or require scoped auto-apply permission
- destructive: explicit confirmation
- external network/cloud: obey privacy/routing policy; clearly surface destination
- cost-incurring: show cost class/budget where possible
- execute code/shell: restricted to coding/developer context; never exposed to ordinary story agents

## 8.5 MCP

Implement MCP as an optional interoperability surface, not as the internal domain model.

Expose tools such as:

- `search_world`
- `read_entity`
- `read_scene`
- `get_state_snapshot`
- `search_assets`
- `get_reference_set`
- `propose_patch`
- `create_scene_branch`
- `create_moment`
- `create_shot`
- `queue_generation`
- `get_render_status`

Use current MCP patterns; do not architect new code around deprecated roots/sampling behavior. Direct LLM-provider adapters remain the app’s model layer.

---

# 9. Expected Tools by Workspace

## 9.1 WORLD — professional expectations + AI-native additions

Expected tools:

- Markdown editor
- YAML/property editor
- file tree
- backlinks/outgoing links/unlinked mentions
- full-text search
- tag/property filters
- table/list/card/gallery views
- knowledge graph
- freeform canvas
- relationship editor
- chronology/timeline
- calendar/event view
- character sheet templates
- location/faction/technology templates
- glossary/terminology manager
- source/research notes and citations
- image/reference attachments
- version history/diff
- bulk rename/link repair
- orphan/broken-link detector

AI-native tools:

- canon conflict detection
- missing-information detection
- truth vs character knowledge vs audience knowledge
- automatic relationship suggestions (proposed, never silently committed)
- lore expansion branches
- context-aware research assistant
- “where is this established?” provenance search
- state propagation preview

## 9.2 STORY

Expected tools:

- premise/logline
- outline
- sequence cards
- beat board
- screenplay/script editor
- scene navigator
- dialogue editor
- character arc view
- scene notes
- revisions/diff
- alternate versions/branches
- read-through / TTS scratch playback
- word/page/time estimates
- comments/markers

AI-native tools:

- scene start/end state
- moment extraction
- contradiction checks
- character-voice checks
- reveal/secret tracking
- knowledge matrix
- alternate scene branches
- intent-preserving rewrites
- visual-moment suggestions
- scene-readiness preflight

## 9.3 STUDIO

Expected tools:

- reference library
- contact sheet/gallery
- mood/style boards
- storyboard board
- shot list
- shot numbering/slate
- camera/framing/lens notes
- aspect-ratio guides
- safe-frame overlays
- annotations/draw-over
- first/last frame selector
- frame grab/extract
- image variants
- take versions
- compare A/B/side-by-side
- approval/reject/hold
- timecoded review notes
- render queue
- output browser
- proxy/full-quality switching
- basic color/reference checks

AI/H3-native tools:

- semantic reference roles
- automatic H3 mode routing
- H3 prompt compiler
- H3 duration/frame-grid preview
- H3 reference-budget meter
- model/workflow preflight
- motion/camera reference library
- prompt diff between takes
- continuity checker
- lineage graph
- generation cost/time estimate
- `Continue Take`
- “reuse performance but change camera” style operations
- “reuse identity only” guardrails
- batch generation by model family

## 9.4 CUT

Expected tools:

- timeline
- video/audio tracks
- trim
- split
- ripple edit
- slip/slide where feasible
- clip enable/disable
- transitions/crossfades
- basic speed control
- markers
- scene/shot boundaries
- dialogue/VO tracks
- SFX tracks
- music tracks
- clip gain/fades
- mute/solo
- timecode
- subtitles/captions track
- version switching per shot
- proxy/full-res toggle
- basic render/export
- OTIO export
- review notes

Do not build a full color-grading suite, compositing suite, or DAW in v1.

AI-native additions:

- identify missing shots
- detect placeholder/rough clips
- detect continuity risk at cuts
- compare timing against scene intent
- automatically relink newer approved takes
- generate temp ambience/SFX suggestions
- create review summary

---

# 10. Asset & Lineage System

Every asset receives:

- stable asset ID
- relative path
- media type
- MIME/container info
- checksum
- dimensions/duration/sample rate where relevant
- created/ingested time
- source type (`imported`, `generated`, `extracted`, `derived`)
- parent asset(s)
- associated world entities
- associated scenes/shots
- reference roles
- status (`exploration`, `candidate`, `approved`, `canon`, `rejected`)

Generated files must additionally store:

- generation packet ID
- renderer/model
- workflow adapter + version/hash
- seed/settings
- prompt compiler + version
- input asset IDs
- backend job ID

Never rely on filenames for lineage.

---

# 11. Indexing & Search

Authoritative data: files.

Index:

- SQLite
- FTS5 for text
- explicit link/backlink tables
- property index
- asset metadata
- scene/shot/state tables

Rules:

- index can be rebuilt from project files
- use a dedicated application ID/user schema version
- migrations are transactionally applied and tested
- enable defensive SQLite settings appropriate for an application-controlled database
- integrity check available under Project Health
- semantic/vector search is optional later, not required for v1

---

# 12. Security & Privacy Baseline

Use OWASP ASVS concepts as a security requirements checklist even though this is a desktop application with local services.

## 12.1 Tauri

- Use least-privilege Tauri capabilities per window/webview.
- Explicitly enable only needed filesystem/process/network permissions.
- Scope filesystem access to selected project roots and app data.
- Do not expose generic arbitrary shell execution to the frontend.

## 12.2 Secrets

- API keys/tokens are stored in secure secret storage (for Tauri, Stronghold or an OS-backed equivalent).
- Never store secrets in project YAML, Markdown, logs, generation packets, crash reports, or Git.
- Redact secrets from structured logs and error displays.

## 12.3 Project File Safety

- Use atomic writes: write temporary file → flush → rename.
- Maintain automatic backups for schema migrations and risky bulk operations.
- Validate paths to prevent escaping the project root.
- Treat external symlinks and network paths carefully.
- Never auto-execute scripts embedded in Markdown/canvas content.
- Sanitize rendered Markdown/HTML.

## 12.4 Agent Safety

- Read-only by default.
- Reviewable patches for writes.
- Destructive operations require explicit confirmation.
- Imported agent/tool definitions are untrusted until approved.
- A model must never be allowed to change its own permissions.
- A prompt injection inside project/research content must not grant additional tools or override system policy.

## 12.5 ComfyUI Safety

- Treat imported custom nodes/workflows as code-bearing dependencies.
- Surface required custom nodes before running a workflow.
- Maintain a trusted/untrusted state for workflow adapters.
- Do not auto-install custom nodes without explicit user approval.

## 12.6 Privacy Modes

- Local Only — no project content leaves the machine.
- Local First — local preferred; cloud requires policy/approval.
- Cloud Allowed — selected providers allowed.

Routing decisions must be visible in job metadata.

---

# 13. Coding Agent Operating Contract

Create a repository-root `AGENTS.md` containing the following rules.

## 13.1 Before Coding

The coding agent MUST:

1. Read `AGENTS.md`.
2. Read the active milestone in `ROADMAP.md`.
3. Read relevant architecture/data-model docs.
4. Inspect existing implementation before proposing replacement logic.
5. Update/confirm the task checklist and acceptance criteria.
6. Identify whether the change affects:
   - public behavior
   - persisted data/schema
   - provider/renderer contracts
   - security permissions
   - documentation
   - migration requirements
7. Mark the task `IN PROGRESS` before implementation.

## 13.2 During Coding

The coding agent MUST:

- make the smallest coherent change
- preserve existing behavior unless the task explicitly changes it
- keep domain logic out of UI components
- keep external provider logic behind adapters
- use typed/validated boundaries
- avoid duplicated business rules
- add/update tests with behavior changes
- update schemas before writing data that violates current schemas
- add migrations before changing persisted formats
- update docs in the same change when behavior changes
- record significant architectural decisions as ADRs
- never silently weaken a security check to make a test pass
- never mark a task complete while required checks fail

If user requirements change mid-task:

1. update the task/acceptance criteria
2. update affected design docs
3. identify superseded work
4. adapt implementation
5. rerun validation

Do not continue implementing against stale requirements.

## 13.3 After Coding

The agent MUST run the applicable verification suite:

```text
format
lint
TypeScript typecheck
unit tests
integration tests
Rust fmt/clippy/tests
schema validation
migration tests
selected E2E tests
security/dependency checks
build/package smoke test
```

Then:

- update `CHANGELOG.md` if user-visible/notable
- update `ROADMAP.md` checkboxes
- update relevant docs
- add/update ADR if architecture changed
- include migration notes if persisted behavior changed
- summarize changed files
- summarize tests run and results
- list known limitations/follow-up items
- mark task complete only if Definition of Done is satisfied

## 13.4 Definition of Done

A task is DONE only when:

- [ ] acceptance criteria satisfied
- [ ] code compiles/builds
- [ ] formatting passes
- [ ] lint/typecheck passes
- [ ] relevant unit tests pass
- [ ] relevant integration/E2E tests pass
- [ ] schemas validate
- [ ] migrations added/tested if needed
- [ ] documentation updated if behavior changed
- [ ] changelog updated if notable
- [ ] security implications reviewed
- [ ] no secrets/debug artifacts added
- [ ] manual smoke test recorded when UI behavior changed
- [ ] task checklist updated

No “done except tests.” If a test cannot run, task remains `BLOCKED` or `DONE WITH EXPLICIT WAIVER`, with the reason recorded.

---

# 14. Required Repository Documentation

```text
README.md
AGENTS.md
ROADMAP.md
CHANGELOG.md
CONTRIBUTING.md
SECURITY.md

docs/
├── product/
│   ├── vision.md
│   ├── workspaces.md
│   └── glossary.md
├── architecture/
│   ├── overview.md
│   ├── boundaries.md
│   ├── data-flow.md
│   └── decisions/
│       └── ADR-0001-*.md
├── data/
│   ├── project-format.md
│   ├── schemas.md
│   ├── migrations.md
│   └── lineage.md
├── agents/
│   ├── model-gateway.md
│   ├── permissions.md
│   ├── context-engine.md
│   └── patch-system.md
├── render/
│   ├── comfyui.md
│   ├── workflow-adapters.md
│   └── minimax-h3.md
├── security/
│   ├── threat-model.md
│   ├── secrets.md
│   └── permissions.md
└── development/
    ├── setup.md
    ├── testing.md
    ├── release.md
    └── troubleshooting.md
```

Documentation rules:

- Docs are reviewed as part of code changes.
- Generated API/schema docs should be generated from source where possible.
- If a public interface changes, docs and changelog must change in the same PR/commit set.
- If an architecture boundary changes, add/update an ADR.
- If a schema changes, update schema docs and migration docs.
- If an H3/workflow adapter changes semantics, update render docs and compatibility tests.

---

# 15. Change Tracking & Versioning

Use separate version domains:

- app version
- project format version
- schema versions
- workflow adapter versions
- prompt/compiler versions
- agent definition versions

Use Semantic Versioning for public packages/adapters once their contracts are declared.

Use Conventional Commits:

```text
feat(studio): add H3 reference resolver
fix(canon): prevent stale agent patch application
docs(h3): document reference budget
refactor(render): isolate ComfyUI adapter
```

Maintain `CHANGELOG.md` with an `Unreleased` section.

Do not rewrite released migration history; add a new migration.

---

# 16. Database Migration Discipline

Each migration:

```text
.project/migrations/
0001_initial.sql
0002_asset_lineage.sql
0003_state_snapshots.sql
```

Rules:

- monotonically ordered
- transaction when supported
- pre-migration backup for destructive project changes
- forward migration test
- fresh-database test
- old-project upgrade fixture
- index rebuild path
- integrity check after migration
- application/user schema version updated only by migration runner

Because SQLite is an index/cache, if an index migration becomes irrecoverable, the app should be able to rebuild from authoritative files instead of risking user content.

---

# 17. Testing Strategy

## Unit

- domain state transitions
- scene/moment/shot validation
- H3 mode routing
- H3 duration resolver
- reference numbering
- prompt section compiler
- path safety
- agent permission decisions
- patch conflict detection

## Schema/Fixture

- every example document validates
- every migration fixture upgrades
- backward compatibility fixtures
- malformed data fails with useful diagnostics

## Integration

- project open/index/rebuild
- Markdown edit → index update
- agent patch → review → apply
- ComfyUI submit → WebSocket progress → output ingestion
- cancelled/failed render jobs
- workflow adapter compatibility detection

## E2E

- create project
- create character/location
- create scene/moment/shot
- assign references
- compile H3 packet
- queue mocked/local render backend
- approve take
- place in CUT
- export OTIO/preview

## Golden Tests

Use golden/snapshot fixtures for:

- H3 compiled prompts
- workflow-adapter transformed API JSON
- OTIO output
- Markdown frontmatter serialization

Snapshot changes require explicit review, never automatic blanket acceptance.

---

# 18. CI Quality Gates

Minimum pull-request gates:

- formatter
- lint
- typecheck
- unit tests
- schema validation
- migration tests
- Rust fmt/clippy/test
- frontend build
- dependency review/security scan where available

Main/release gates additionally:

- E2E smoke suite
- packaging smoke test
- clean project create/open
- old fixture project migration
- documentation link check
- generated schema/docs drift check

Never disable a failing gate simply to merge. Fix, document a temporary waiver, or revert the risky change.

---

# 19. Dependency & Supply-Chain Rules

- Commit lockfiles.
- Pin CI actions/dependencies to appropriate stable versions.
- Review new dependencies before adding them.
- Prefer mature libraries over custom implementations for security-sensitive primitives.
- Run dependency review on PRs.
- Enable automated dependency update tooling.
- Keep a documented list of external binaries/sidecars (FFmpeg, ComfyUI, etc.).
- Verify downloads/checksums where practical.
- Never auto-install arbitrary ComfyUI custom nodes or model scripts without user confirmation.

---

# 20. Observability & Diagnostics

Structured local logs with categories:

- app
- project
- indexing
- agent
- provider
- render
- comfyui
- h3
- media
- migration
- security

Requirements:

- redact API keys/tokens
- correlation ID for agent/render jobs
- packet/job/take IDs in render logs
- user-facing error summary + expandable technical detail
- diagnostic bundle export must exclude secrets by default
- telemetry is opt-in

Project Health panel:

- broken links
- orphan notes
- schema errors
- missing assets
- broken references
- unresolved workflow adapters
- pending migrations
- SQLite integrity
- stale generation packets
- missing final media
- continuity warnings

---

# 21. Undo, Versioning, and Reversibility

At minimum:

- editor undo/redo
- file history for important authored objects
- reversible agent patches
- approved/canon asset versioning
- scene branches
- take history
- timeline autosave/version snapshots

Bulk agent edits should be grouped as one reversible transaction from the user’s point of view.

---

# 22. Performance Rules

- Lazy-load thumbnails/media.
- Generate proxies for large video.
- Do not parse the entire vault on every keystroke.
- Incremental file watching/indexing.
- Background workers for media metadata/thumbnails.
- Virtualize large lists/grids.
- Cache graph/query results with invalidation.
- Keep render queue independent from UI lifecycle.
- Persist enough job state to recover after app restart.

---

# 23. v1 Milestones

## Phase 0 — Repository & Guardrails

- [ ] repository scaffold
- [ ] AGENTS.md
- [ ] ROADMAP.md
- [ ] CHANGELOG.md
- [ ] docs skeleton
- [ ] CI baseline
- [ ] formatter/linter/typecheck/tests
- [ ] security baseline

## Phase 1 — Vault Foundation

- [ ] project create/open
- [ ] Markdown editor
- [ ] YAML frontmatter
- [ ] wikilinks
- [ ] backlinks
- [ ] search/FTS
- [ ] file watcher
- [ ] SQLite index/rebuild
- [ ] basic graph
- [ ] canvas
- [ ] attachments
- [ ] project health

## Phase 2 — Structured World

- [ ] WorldEntity schemas
- [ ] templates
- [ ] property views
- [ ] relationships
- [ ] timeline/events
- [ ] canon status
- [ ] references
- [ ] truth/knowledge model

## Phase 3 — Agents

- [ ] model gateway
- [ ] local/cloud provider adapters
- [ ] context inspector
- [ ] patch system
- [ ] tool permissions
- [ ] Writing Partner
- [ ] Canon Keeper
- [ ] Character Director
- [ ] Continuity Supervisor

## Phase 4 — Story

- [ ] sequences
- [ ] scenes
- [ ] state snapshots
- [ ] beats
- [ ] moments
- [ ] screenplay editor
- [ ] branches
- [ ] reveal/knowledge tracking

## Phase 5 — Studio / Images

- [ ] asset library
- [ ] reference sets
- [ ] visual exploration board
- [ ] storyboard
- [ ] shot objects
- [ ] ComfyUI backend connection
- [ ] generic workflow adapters
- [ ] image generation ingest/lineage

## Phase 6 — MiniMax H3

- [ ] H3 capability profile
- [ ] mode router
- [ ] duration resolver
- [ ] resolution resolver
- [ ] semantic reference resolver
- [ ] base prompt compiler
- [ ] full-reference compiler
- [ ] H3 preflight
- [ ] FL2VA workflow adapter
- [ ] Ref2VA workflow adapter
- [ ] queue/progress
- [ ] take compare
- [ ] continuation
- [ ] prompt/packet inspector

## Phase 7 — Cut

- [ ] OTIO-backed sequence model
- [ ] playback/proxies
- [ ] video/audio tracks
- [ ] trim/split/ripple
- [ ] markers
- [ ] transitions
- [ ] shot version switching
- [ ] autosaves
- [ ] FFmpeg preview export
- [ ] OTIO export

## Phase 8 — Intelligence/Polish

- [ ] visual continuity assistance
- [ ] production readiness checks
- [ ] missing-shot detection
- [ ] semantic search optional
- [ ] motion/camera library
- [ ] batch optimization
- [ ] cost/time estimates
- [ ] project diagnostics bundle

---

# 24. Phase Checklist Format for Coding Agent

Every milestone should be represented in `ROADMAP.md` like:

```md
## P1.4 Backlinks
Status: IN PROGRESS
Owner: agent

Acceptance criteria
- [x] Parse wikilinks from Markdown body
- [x] Parse links from frontmatter
- [ ] Update backlink index incrementally on file save
- [ ] Display linked mentions
- [ ] Display broken links
- [ ] Unit tests
- [ ] Integration test
- [ ] docs/world/backlinks.md updated

Notes
- 2026-08-09: frontmatter parser changed to support quoted wikilinks.
```

If the user changes behavior, the agent edits this checklist immediately rather than relying on memory.

---

# 25. Change-Impact Matrix

Before completion, classify the change:

| Change | Tests | Docs | Changelog | Migration | ADR |
|---|---|---|---|---|---|
| UI-only cosmetic | smoke | if user-facing workflow changes | optional | no | no |
| Domain behavior | unit + integration | yes | yes if notable | maybe | maybe |
| Persisted schema | schema + migration fixtures | yes | yes | **yes** | often |
| Provider adapter | contract + mocked integration | yes | maybe | no | maybe |
| H3 compiler | golden + unit + integration | yes | yes if output semantics change | no | maybe |
| Security permissions | security + E2E | **yes** | yes | no | **yes** |
| Architecture boundary | integration | **yes** | maybe | maybe | **yes** |

This matrix is guidance; the agent may increase verification, never decrease it without an explicit reason.

---

# 26. Architecture Boundaries

```text
UI / Presentation
       ↓
Application Use Cases
       ↓
Domain Model
       ↓
Ports / Interfaces
       ↓
Adapters
  ├── Filesystem
  ├── SQLite
  ├── LLM Providers
  ├── MCP
  ├── ComfyUI
  ├── MiniMax H3 Compiler
  ├── FFmpeg
  └── OTIO
```

Rules:

- Domain model cannot import ComfyUI/H3/provider SDKs.
- UI cannot mutate SQLite directly.
- Provider adapters cannot write project files directly.
- Agent writes go through project services/patch service.
- Render output ingestion goes through asset/lineage service.
- Schema validation happens at all persistence/external boundaries.

---

# 27. Recommended Technology Baseline

Desktop:

- Tauri 2
- Rust backend for privileged filesystem/process/security operations

Frontend:

- React + TypeScript
- strict TypeScript
- CodeMirror 6 for Markdown/script editing
- React Flow or equivalent for manual creative graph/canvas
- a WebGL graph library later for very large auto-generated graphs

Data:

- Markdown/YAML
- JSON Schema 2020-12
- SQLite + FTS5
- JSON Canvas-compatible canvas

Media:

- FFmpeg sidecar/tooling
- OpenTimelineIO

AI:

- direct provider adapters + generic OpenAI-compatible adapter
- optional MCP interoperability

Render:

- ComfyUI HTTP/WebSocket backend adapter
- versioned workflow adapters
- MiniMax H3 first-class compiler

---

# 28. Explicit Non-Goals for v1

Do not build:

- a full Premiere/Resolve replacement
- a full DAW
- full compositing/VFX
- 3D modeling
- custom LLM inference engine
- a ComfyUI competitor node editor
- mandatory cloud collaboration
- autonomous agent swarm
- proprietary binary project format
- vector database dependency in the critical path

---

# 29. Product Success Test

The product is working when a creator can:

1. create a world in Markdown
2. link characters, locations, rules, and history
3. ask agents questions with visible context
4. accept/reject AI patches without losing control
5. outline a story
6. create a scene with explicit state/reveal changes
7. turn scene moments into shots
8. assign reusable identity/style/motion/voice references
9. generate images through ComfyUI
10. compile an H3 shot without manually managing `<Picture N>`/`<Video N>`/`<Audio N>` tags
11. generate and compare multiple H3 takes
12. continue an approved take with inherited continuity
13. place approved takes into an edit
14. export a preview and OTIO timeline
15. reopen the project months later and understand exactly how every important asset was created

---

# 30. First Instruction to the Coding Agent

Do **not** start by implementing video generation.

Start Phase 0 and Phase 1. The vault, schemas, project services, change tracking, test discipline, and documentation rules are the foundation upon which the worldbuilding, agents, H3 compiler, ComfyUI integration, and editorial system depend.

For every completed item:

- check it off in `ROADMAP.md`
- record implementation notes when useful
- run required checks
- update documentation in the same change
- never claim completion when required checks are failing

