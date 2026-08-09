# AI-Native Animation & Worldbuilding Production OS
## Consolidated Build Specification v0.2

**Planning status:** coding-agent handoff candidate; implementation has not started.

**Working product name:** intentionally open. Any story/world names used in examples are illustrative project data, not the product name.

This consolidated document packages the principal v0.2 product, architecture, production, AI, rendering, editorial, security, testing, and coding-agent contracts into one portable Markdown file. The companion starter-pack ZIP remains authoritative for individual files, JSON Schemas, fixtures, and validation evidence.

## Core promise

A local-first creative production environment in which Markdown world knowledge, screenplay/scene intent, visual references, generated media, MiniMax H3/ComfyUI rendering, review, and editorial assembly share one linked production model while remaining portable and inspectable.

**Primary flow:** WORLD → STORY → STUDIO → CUT.

---

# Appendix — PRODUCT_SPEC_V0.2

_Source file: `PRODUCT_SPEC_V0.2.md`_

# AI-Native Animation & Worldbuilding Production OS
## Product / UX Specification v0.2

> Working product name intentionally left open. This document refines v0.1 from architecture into an implementable creator workflow.

## 1. Product statement

Build a local-first desktop production environment for creators who use Markdown knowledge bases, LLM writing/worldbuilding assistants, ComfyUI image/video workflows, and AI-native video models such as MiniMax H3.

The application must make the full journey coherent:

**World → Story → Scene → Moment → Board → Shot → References → Generate → Review → Cut → Export**

It should feel closer to an advanced Obsidian-style creative vault fused with a purpose-built storyboard/animatic studio than a traditional NLE or a giant node graph.

The core innovation is a shared production context: world canon, story state, character knowledge, visual references, shot intent, generated media lineage, and edit decisions all remain linked.

## 2. Core design principles

1. **Markdown is durable authoring.** Worldbuilding is stored in ordinary `.md` files with YAML properties and wikilinks.
2. **Fountain is durable screenplay text.** The master screenplay may be stored as `.fountain`; structured scene capsules remain separate durable objects.
3. **Media is not buried.** Images, video, audio, proxies, and exports are ordinary files with metadata sidecars/records.
4. **SQLite is an index, not the truth.** It can be rebuilt from files.
5. **AI is contextual, replaceable, and reviewable.** Agents propose patches; they do not silently rewrite canon.
6. **ComfyUI is a render engine.** The user works with shot intent and reference roles; node IDs stay behind adapters.
7. **H3 is first-class but not the domain model.** H3 gets the richest compiler and UX, but stored shots remain renderer-neutral.
8. **Storyboard and animatic tools are real production tools.** Users get panel timing, captions, playback, audio scrubbing, camera guides, annotations, and take review—not only prompt boxes.
9. **Every generated asset has lineage.** A creator can always trace a frame or clip back to scene, shot, prompt compiler, refs, model, workflow, and settings.
10. **Documentation is executable project knowledge.** Behavior, schemas, migrations, tests, and docs must change together.

## 3. Top-level application model

Only four primary workspaces appear in the main navigation:

- **WORLD** — canon, notes, graph, relationships, timeline, research, references.
- **STORY** — screenplay, outline, sequences, scenes, beats, moments, branches, reveals.
- **STUDIO** — visual development, boards, shots, references, ComfyUI, H3, takes, review.
- **CUT** — animatic/edit, audio, versions, markers, review, export.

Persistent global surfaces:

- project switcher
- universal search / quick open
- command palette
- assistant/context drawer
- asset library
- render queue
- problems/project-health center
- activity/history
- settings

Do not add new top-level tabs for every subsystem. Prefer contextual panels and saved workspaces.

## 4. App shell

### 4.1 Default desktop layout

- **Left rail:** project tree + workspace-specific navigator.
- **Center:** active editor/canvas/timeline.
- **Right inspector:** selected object, properties, references, agent context, warnings.
- **Bottom drawer:** queue, logs, search results, take strip, audio waveform, or problems depending on task.
- **Top bar:** workspace tabs, current project, breadcrumbs, save/sync state, command palette, render status.

Panels are dockable and hideable. The app ships with curated workspace layouts rather than exposing an empty docking system on first launch.

### 4.2 Interaction rules

- Single click selects; Enter/double-click opens.
- `Ctrl/Cmd+P`: quick open.
- `Ctrl/Cmd+K`: command palette.
- `/` in Markdown: block/entity/agent commands.
- `@` in supported fields: entity/asset/reference mention.
- `[[` begins a wikilink in Markdown.
- `Alt/Option+Enter`: ask active contextual agent.
- `Ctrl/Cmd+Shift+P`: show compiled production packet for selected shot.
- Destructive actions require undo support or versioned recovery.

## 5. WORLD workspace

WORLD is an advanced local Markdown knowledge environment. It must be useful even before any AI features are configured.

### 5.1 Core panes

**Navigator**
- file/folder tree
- entity type filters
- saved views
- bookmarks
- recent notes
- orphan/unlinked notes
- research inbox

**Markdown Editor**
- Markdown source and reading modes
- YAML property editor
- wikilinks, embeds, callouts, tables, code blocks
- heading outline
- backlinks and unlinked mentions
- aliases/tags
- split view
- page preview
- diff/history
- agent gutter suggestions

**Context Inspector**
- entity type/status
- canon authority
- relationships
- appearances in scenes
- references
- related timeline events
- inbound/outbound links
- truth/knowledge visibility
- agent context preview

### 5.2 Entity templates

Initial templates:

- Character
- Location
- Faction
- Culture
- Creature
- Technology
- Item/Prop
- Historical Event
- Rule/Law of World
- Theme/Motif
- Research Note

Templates define default frontmatter, optional sections, validation, and suggested views. Users may create their own templates.

### 5.3 Property views

Provide table, list, and card/gallery views over Markdown notes using frontmatter properties. Required operations:

- filter
- sort
- group
- visible columns
- saved view
- inline property edit
- create new entity from view
- export CSV
- query active note relationships (for example, “scenes containing this character”)

Do not duplicate note content into a separate database entry. Property edits write back to frontmatter.

### 5.4 Graph modes

Two graph experiences:

**Knowledge Graph**
- automatic graph from links and typed relationships
- filter by type/tag/status/folder
- focus neighborhood
- pin nodes
- color/shape by semantic type
- click to open
- path finder between entities
- orphan detection

**Creative Canvas**
- manually arranged infinite canvas
- Markdown note cards
- images/video/audio
- groups/frames
- text cards
- relationship edges
- scene/character cards
- convert temporary text card into durable note
- embed saved queries/views

Use JSON Canvas compatibility where it does not block richer application features. App-specific extensions must be namespaced and degradable.

### 5.5 World timeline

A real chronological world timeline, separate from editorial time:

- dated/relative events
- eras
- uncertain dates/ranges
- character lifespans
- faction periods
- historical events
- story-present marker
- filters by entity
- conflict warnings (e.g. character appears before birth)

### 5.6 Relationships

Support typed, directional relationships:

- knows
- allied_with
- enemy_of
- located_in
- member_of
- owns
- created_by
- parent_of
- reports_to
- custom

Relationship edits should optionally create/update human-readable links in Markdown where appropriate.

### 5.7 Truth / character knowledge / audience knowledge

The world may contain objective truth that characters or the audience do not know yet.

The UI must let creators mark facts as:

- world truth
- believed by character(s)
- unknown to character(s)
- audience knows after scene X
- false belief / rumor
- secret

Agents must use this layer to avoid accidental spoilers or omniscient dialogue.

### 5.8 Research inbox

Provide a safe staging area for web/LLM research:

- captured source metadata
- notes/quotes within copyright limits
- source URL
- retrieval date
- confidence/status
- “promote to canon” action
- agent summary
- unresolved questions

Research never becomes canon automatically.

### 5.9 Expected creator tools

- spellcheck
- find/replace
- word count
- note templates
- quick switcher
- backlinks
- outline
- bookmarks
- tags/properties
- note split/merge
- file recovery/snapshots
- export Markdown/PDF later
- image/audio/video embeds
- drag/drop attachments
- batch rename with safe link update

### 5.10 AI-native additions

- Ask about selected paragraph/entity
- Expand missing sections
- Generate questions, not only answers
- Canon conflict check
- Character voice check
- Relationship suggestions
- Find missing consequences
- Summarize a graph neighborhood
- “What changes if this fact changes?” impact analysis
- propose structured property updates as patch
- create alternate non-canon branch

## 6. STORY workspace

STORY converts world knowledge into narrative without forcing traditional script software to be the center of the entire product.

### 6.1 Story navigator

Hierarchy:

Project
→ Act (optional)
→ Sequence
→ Scene
→ Beat
→ Moment

Views:
- outline tree
- index cards
- scene list/table
- screenplay navigator
- character arc view
- reveal/knowledge view

### 6.2 Screenplay editor

Support Fountain as the plain-text screenplay format. At minimum:

- scene headings
- scene numbers
- action
- character
- dialogue
- parentheticals
- dual dialogue
- transitions
- notes
- boneyard/comments
- sections
- synopses

The editor should provide smart formatting while preserving valid plain text. A raw Fountain mode must always be available.

### 6.3 Scene Capsule

Every scene has a structured companion object:

- slug/title
- screenplay range/link
- location
- characters present
- story purpose
- starting state
- ending state
- emotional movement
- information revealed
- information concealed
- character knowledge changes
- physical state changes
- props/costume state
- time-of-day / chronology
- continuity dependencies
- unresolved questions
- status

The Scene Capsule is not a replacement for the screenplay. It is the production/state layer around it.

### 6.4 Beats and Moments

**Beat** = dramatic/narrative action.

**Moment** = something the audience should experience visually or aurally that may later become one or more shots.

Moments can be generated from beats, authored manually, reordered, merged, or discarded without rewriting the screenplay.

### 6.5 Scene Lab

A focused scene-development view with:

- scene purpose
- before/after state
- selected screenplay text
- beat/moment lane
- character objectives
- tension/emotion curve (qualitative, not pseudo-scientific scoring)
- reveal tracker
- visual ideas
- continuity warnings
- agent conversation scoped to this scene

### 6.6 Branching and comparison

Branching is for creative alternatives, not Git exposure.

- duplicate scene/sequence as branch
- side-by-side screenplay compare
- compare scene state effects
- compare downstream continuity impact
- promote chosen branch
- preserve rejected branches

### 6.7 Dialogue tools

Expected tools:

- character autocomplete
- parenthetical handling
- dialogue-only view
- read-through mode
- temporary TTS/voice audition
- line alt versions
- pronunciation notes
- speaking-time estimate
- dialogue search by character

AI-native additions:

- voice consistency check
- subtext alternatives
- “keep meaning, change intensity”
- “what does each character know here?”
- callback/foreshadow search
- repetitive phrasing detector

### 6.8 Story diagnostics

Diagnostics are warnings, never hard creative gates:

- scene has no state change
- information revealed before intended reveal
- character uses knowledge they do not possess
- location continuity mismatch
- unresolved introduced prop
- dangling branch
- scene not represented in boards/shots

## 7. STUDIO workspace

STUDIO turns narrative intent into visual and audiovisual assets. It is the main bridge to ComfyUI and H3.

### 7.1 Studio modes

Inside STUDIO, use a secondary mode switcher rather than top-level tabs:

- **Explore** — visual development canvas
- **Boards** — storyboard/animatic panels
- **Shots** — shot design and generation packets
- **Takes** — render review/comparison
- **Library** — production asset/reference browser

### 7.2 Asset Library

Every media asset gets durable metadata:

- stable asset ID
- file path
- media type
- source type (imported/generated/derived)
- entity associations
- scene/moment/shot associations
- semantic role
- authority (canon/guidance/inspiration)
- generation lineage
- dimensions/duration/fps/audio info
- checksum
- created/modified
- tags
- review status

Filters:
- media type
- entity
- scene
- shot
- semantic role
- renderer/model
- status
- lineage parent
- date

Asset operations:
- compare
- mark canon/approved/rejected
- set role
- create reference set
- frame grab
- proxy creation
- reveal in folder
- open externally
- inspect metadata
- find duplicates

### 7.3 Visual Development Canvas

An infinite working space for exploration:

- concept images
- canonical refs
- Markdown notes
- scene cards
- style clusters
- costume variants
- location explorations
- arrows/relationships
- generation prompt cards
- “generate variations” from selected cluster
- compare results next to source references

It should support fast messiness without polluting canon. Temporary canvas items become durable assets/notes only when promoted.

### 7.4 Storyboard

A storyboard panel contains:

- frame image/sketch
- scene/moment link
- panel number
- duration
- dialogue caption
- action caption
- timing/slugging caption
- production notes
- camera note
- sound note
- voice annotation
- layer/annotation overlay
- status

Expected tools:
- add/delete/duplicate/reorder panel
- split/merge panel
- thumbnails strip
- drag scene boundaries
- duration edit
- ripple/non-ripple timing mode
- audio track placement
- waveform and audio scrubbing
- playback range
- loop playback
- frame-by-frame stepping
- transitions
- camera pan/zoom simulation
- safe area/aspect guides
- simple draw/arrow/text markup
- crop/transform
- compare panel revisions

Do not attempt to become a full raster drawing application in v1. Provide enough paint-over/markup for notes and camera planning.

### 7.5 Board generation

A Moment can request visual exploration:

1. choose generation recipe
2. collect inherited references
3. generate cheap exploration batch
4. select candidates
5. refine candidates
6. approve one/more as board panels
7. optionally mark as first/last-frame candidate

The UI should support “generate around selected panel” rather than forcing prompt re-entry.

### 7.6 Shot Designer

A shot is a production object with sections:

**Purpose**
- what the shot communicates
- associated moment

**Timing**
- target duration
- hard maximum
- model-resolved duration
- handles

**Composition**
- shot size
- angle
- aspect ratio
- lens intent
- framing guides

**Performance**
- character objective
- action beats
- facial/body language
- dialogue
- lip/closed-mouth requirements

**Camera**
- move
- speed
- amplitude
- stabilization
- start/end framing

**Environment**
- location
- lighting
- atmosphere
- active props
- environmental motion

**Audio**
- dialogue/VO
- ambience
- SFX
- music instruction
- voice reference

**References**
- semantic role
- authority
- per-renderer mapping preview

**Generation**
- preferred renderer
- profile
- workflow adapter
- advanced overrides

### 7.7 Reference Sets

References are not unlabeled attachments. Each reference has a job:

- identity
- body/proportion
- costume
- prop
- environment
- style
- composition
- first frame
- last frame
- motion
- camera motion
- acting/performance
- voice
- audio texture

Authority:
- LOCKED / canon
- GUIDANCE
- INSPIRATION
- ROLE_ONLY (for example motion only)

Resolver responsibilities:
- inherit character/location defaults
- detect conflicting references
- avoid duplicate redundant refs
- maintain renderer limits
- produce deterministic reference ordering
- show what will actually be sent

### 7.8 H3 first-class UX

H3 support must expose the model's strengths without requiring users to memorize syntax.

**Mode Router**
- T2VA: text-only audiovisual generation
- I2VA: first-frame image + prompt
- FL2VA: first and/or last frame with motion path
- Ref2VA/R2V: multimodal reference-driven generation

**H3 preflight**
- output duration 4–15 sec
- 24 fps
- 768px short-edge native base target
- multiple-of-32 resolution grid
- ComfyUI duration grid awareness
- reference limits: up to 9 images, 3 videos, 3 standalone audios, mixed max 12
- reference video/audio duration validation
- audio cannot be sole Ref2VA input
- `ref_image_size` choice (`match` vs `max`)
- model family check (FL2VA vs Ref2VA weights)

**Prompt Compiler**
Human fields compile to H3 structured prompt. Display both:
- Director Notes
- Compiled H3 Prompt

Manual prompt override is allowed but marked as an advanced override and saved with lineage.

**Reference mapping preview**
Show:
- Picture 1 → Lan identity
- Picture 2 → costume
- Video 1 → camera motion only
- Audio 1 → voice

Renumber automatically when references change.

**Local/API hybrid**
The renderer interface must allow:
- local H3 base through ComfyUI where licensed/authorized
- MiniMax API where configured
- H3 Context-IR / regeneration workflows when available to the user
- alternative renderers without changing Shot objects

**License/compliance gate**
Do not assume open-weight H3 is licensed in every region. Provider configuration must expose license/territory acknowledgement and allow administrators/users to disable local H3 while keeping generic video renderers available.

### 7.9 Render Queue

Queue features:
- priority
- pause/resume/cancel
- retry
- dependency chain
- grouped batches
- render profile
- device/backend
- estimated VRAM/resource hint
- status/progress
- log excerpt
- output ingestion state

H3 optimization:
- batch FL2VA-family jobs together
- batch Ref2VA-family jobs together
- avoid unnecessary model swaps
- optional low-cost preview profile

### 7.10 Take Review

A Take review workspace must support:

- synchronized side-by-side playback
- A/B toggle
- frame stepping
- loop selection
- waveform/audio toggle
- notes at timestamp
- ratings/status
- identity/continuity observations
- approve/reject/hold
- set as shot default
- derive continuation
- create fix request
- inspect lineage
- open underlying ComfyUI job/workflow

Do not pretend automated scores are truth. Machine checks can be advisory labels only.

### 7.11 Continuation

For short generative clips, “Continue” is a first-class action:

- extract final frame
- optionally choose a cleaner earlier frame
- create next Shot or continuation segment
- inherit scene state
- inherit refs
- carry location/light/costume
- optionally carry audio/voice
- mark lineage chain

## 8. CUT workspace

CUT is an efficient finishing/animatic editor, not a Premiere/Resolve replacement.

### 8.1 Timeline model

Backed by OpenTimelineIO-compatible concepts:
- timeline
- video tracks
- audio tracks
- clips
- gaps
- transitions
- markers
- source ranges
- media references

Our application may maintain richer metadata in a sidecar/domain layer while exporting valid OTIO.

### 8.2 Required editing tools

- insert/overwrite
- select/move
- trim in/out
- ripple trim
- slip (later if implementation is clean)
- split/blade
- delete/ripple delete
- gaps
- simple cross dissolve/fade
- clip enable/mute
- track lock/mute/solo
- snap
- markers
- working range
- loop
- frame stepping
- proxy/full-res toggle
- audio scrubbing
- simple clip gain/fades
- simple speed change if OTIO/export supports it safely

### 8.3 Shot version switching

A timeline clip referencing a production shot can switch approved takes without reconstructing the edit.

Example:

Shot S04_030
- Take 02 approved
- Take 05 alt
- Take 08 new

Timeline clip stores shot identity plus selected take/media version where possible.

### 8.4 Animatic mode

Boards can populate the timeline before video exists. Replacing a board panel with an approved video take should preserve clip intent/timing where practical.

### 8.5 Review tools

- marker comments
- review status
- notes by shot/clip/time
- “open source shot”
- compare current vs previous cut
- export review MP4 with burned-in timecode/shot IDs

### 8.6 Audio

Provide basic film-centric audio placement:
- dialogue/VO tracks
- SFX tracks
- ambience tracks
- music tracks
- waveform
- scrubbing
- fades/gain
- mute/solo

Do not build a full DAW in v1.

### 8.7 Export

Presets:
- Quick Review MP4
- High Quality Master
- Image Sequence (later)
- Audio-only mix/reference
- OTIO package
- Editorial manifest (CSV/JSON)
- Shot list
- Burn-in review export

Export preflight:
- missing media
- offline proxies/originals
- unapproved takes
- frame-rate mismatch
- unresolved gaps
- missing audio
- license/provider warnings

## 9. GLOBAL tools

### 9.1 Universal Search

Search across:
- Markdown text
- properties
- screenplay
- scenes/moments/shots
- assets
- dialogue
- references
- generation lineage
- comments/reviews

Filters must be composable and saved.

### 9.2 Command Palette

Examples:
- Create character
- Create scene
- Open Lan
- Show scenes with Mira
- Ask Canon Keeper
- Generate boards from selected moments
- Create H3 shot from selected panel
- Render selected shots
- Continue approved take
- Show continuity issues
- Open shot in ComfyUI
- Rebuild index
- Project health

### 9.3 Project Health

Project Health is an explicit diagnostic surface:

- schema errors
- broken links
- missing media
- duplicate stable IDs
- stale SQLite index
- invalid workflow adapters
- unavailable renderer/provider
- stale agent patches
- orphaned generated files
- continuity warnings
- docs/version mismatch for developer mode

Health findings distinguish **error**, **warning**, and **advisory**.

### 9.4 Activity / recovery

- autosave
- local snapshots
- file recovery
- undo/redo
- per-object history where feasible
- generation history
- agent patch history
- renderer job logs

## 10. AI / Agent system

### 10.1 Agents are role + context policy + tools + model routing

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

An agent is not permanently bound to a model.

### 10.2 Model Gateway

Provider types:
- OpenAI
- Anthropic
- OpenRouter
- Ollama
- LM Studio
- Generic OpenAI-compatible

Companion support:
- LM Studio LM Link (remote local inference)
- LM Studio Bionic interoperability through open project files and later MCP tools

Routing presets:
- LOCAL ONLY
- LOCAL FIRST
- BALANCED
- BEST QUALITY
- CUSTOM

No silent local→cloud fallback. Cloud use must respect project/provider policy.

### 10.3 Capability registry

Track capabilities rather than assuming all providers/models behave alike:
- text
- vision
- tool calling
- structured output
- reasoning controls
- embeddings
- context limit
- streaming
- remote MCP/tool support
- privacy class
- cost metadata (if known)

Provider adapters normalize outputs into internal messages/results.

### 10.4 Context Inspector

Before sending a request, creators can inspect/modify context:
- current note/scene
- linked entities
- prior/next scenes
- character states
- relevant canon
- references
- selected text
- token/context estimate
- local/cloud destination

### 10.5 Patch-first writes

Agent changes to durable project files use `AgentPatch`:
- target file/object
- base hash/version
- proposed operations
- rationale
- affected canon/state
- confidence/warnings

If the target changed after patch creation, mark patch stale and require rebase/review.

### 10.6 Auto-apply scope

Optional auto-apply is limited to explicitly low-risk areas, for example:
- tags
- inferred aliases
- non-canon scratch notes
- generated summaries

Canon, screenplay, scene state, production status, deletion, provider permissions, and security settings should default to review.

## 11. Service boundaries

Frontend components call application services; they do not directly read provider APIs or mutate domain files.

Required services:

- `ProjectService`
- `VaultService`
- `SchemaService`
- `IndexService`
- `SearchService`
- `GraphService`
- `ViewQueryService`
- `StoryService`
- `StateService`
- `KnowledgeService`
- `ContextService`
- `AgentService`
- `ModelGateway`
- `AssetService`
- `ReferenceService`
- `WorkflowRegistry`
- `ComfyUIAdapter`
- `H3CompilerService`
- `RenderQueueService`
- `ResourceCoordinator`
- `MediaService`
- `ReviewService`
- `TimelineService`
- `ExportService`
- `ProjectHealthService`
- `SecretsService`
- `SettingsService`
- `EventBus`

Detailed contracts live in `docs/architecture/service-boundaries.md`.

## 12. End-to-end flows that must be tested

1. Create project → create Character and Location → link them → graph updates.
2. Write screenplay scene in Fountain → create/link Scene Capsule → state change updates continuity.
3. Build Moment → generate visual exploration → approve board panel.
4. Convert board panel to Shot → assign Reference Set → compile H3 packet.
5. Submit to ComfyUI → receive progress → ingest output → create Take lineage.
6. Approve Take → insert in CUT → export review MP4.
7. Continue Take → new linked shot/segment inherits correct state and refs.
8. Change a canonical character property → impact analysis finds affected scenes/shots but does not silently overwrite them.
9. Disconnect cloud providers → local LM Studio/Ollama agents still work according to capabilities.
10. Corrupt/delete SQLite index → rebuild from project files without losing authored content.
11. Modify a ComfyUI workflow so mapped node changes → adapter fails loudly as incompatible instead of writing to guessed nodes.
12. Edit a file after an AgentPatch is created → stale patch is detected before application.

## 13. Definition of Done for a feature

A feature is not done because the UI looks complete.

Required where applicable:
- acceptance criteria checked
- domain/schema impact assessed
- migrations implemented/tested
- unit tests
- integration tests
- E2E smoke path
- error/empty/loading states
- undo/recovery behavior
- security/privacy review
- accessibility basics
- keyboard behavior
- docs updated
- changelog updated when notable
- ADR updated for architectural decision
- roadmap status updated

## 14. Production technical baseline

These concerns should exist in the domain/architecture even when their full professional feature set arrives later.

### 14.1 Frame rate and timebase
- project editorial frame rate is explicit
- imported media records native fps/timebase
- H3's 24 fps output is recorded rather than assumed globally
- conversions are explicit derived operations
- timecode/frame values use rational/frame-aware representations, not floating-point seconds as the sole truth
- export preflight warns about mismatches

### 14.2 Color
- preserve source color metadata
- per-asset source color-space interpretation/override
- project display/working policy
- do not destructively bake display transforms into canonical source media
- architecture must permit OpenColorIO/ACES-compatible display/export transforms
- unknown color interpretation is visible in Project Health/export preflight

### 14.3 Media relink and offline behavior
- stable Asset IDs survive path changes
- missing media can be relinked by checksum/name/metadata
- offline media does not destroy edit/shot metadata
- proxies and originals remain linked as representations of the same production asset

### 14.4 Resource coordination
A dedicated `ResourceCoordinator` arbitrates heavy local workloads such as ComfyUI, local LLM inference, FFmpeg, and indexing. GPU model unload/reload may be automated only under explicit user policy. Individual provider/render adapters do not secretly kill or unload one another.

### 14.5 Review and handoff
- timecoded review notes
- shot IDs and burn-ins
- editorial manifests
- OTIO interchange
- export presets
- deterministic lineage and hashes for reproducibility

## 15. Explicit non-goals for early versions

- full NLE replacement
- full DAW
- full drawing/painting app
- 3D DCC/modeling suite
- custom ComfyUI node-graph replacement
- autonomous agents changing canon without review
- mandatory cloud account
- mandatory vector database
- proprietary binary project format

## 16. v1 success criteria

A creator can start with a blank local project and finish a short AI-assisted animated sequence while preserving:

- a useful world bible
- a portable screenplay
- connected scene/shot state
- reusable character/location/style references
- generated image/video lineage
- H3-friendly generation workflows
- reviewable takes
- a playable animatic/final cut
- exportable editorial data

The application should reduce repeated prompt rebuilding, reference hunting, continuity errors, lost generations, and context drift—without hiding the creator's own files behind a proprietary system.

---

# Appendix — MASTER_BUILD_SPEC

_Source file: `MASTER_BUILD_SPEC.md`_

# AI-Native Animation & Worldbuilding Production OS
## Master Build Specification v0.2

> Working document intended for a coding agent. Product name is deliberately left open.
>
> v0.2 user-facing behavior is specified in `PRODUCT_SPEC_V0.2.md`; detailed workspace and service contracts live under `docs/`.

---

## 0. Purpose

Build a local-first desktop production environment for worldbuilding, writing, visual development, generative image/video production, and short-film assembly.

The application is **not** a traditional NLE with AI bolted on and is **not** a replacement for ComfyUI. It is the durable production layer above models and renderers.

The product should let a creator move continuously through:

**World → Story → Scene → Moment → Board → Shot → References → Generation → Takes → Assembly → Export**

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

## 5.5 BoardPanel

A storyboard/animatic interpretation of a Moment. A Moment may have several competing BoardPanels before one is approved or promoted into a production Shot.

```yaml
schema_version: 1
id: board_014_02_b
type: board_panel
scene_id: scene_014
moment_id: moment_014_02
shot_id: null
order: 20
status: approved
image_asset_id: img_board_014_02_b
duration:
  frames: 72
  rate: { numerator: 24, denominator: 1 }
captions:
  dialogue: ""
  action: "Lan sees the response before the instruments confirm it."
  slugging: "hold, then slow push"
  notes: "Preserve cockpit window damage."
camera_plan:
  enabled: true
  start: { x: 0.0, y: 0.0, scale: 1.0, rotation_degrees: 0.0 }
  end:   { x: 0.0, y: 0.0, scale: 1.12, rotation_degrees: 0.0 }
  easing: ease_in_out
  notes: "Slow push; no handheld movement."
annotations: []
audio_asset_ids: []
reference_set_id: null
```

BoardPanel timing is exact and frame-aware because boards are also animatic objects. BoardPanels are not canonical Shot definitions and should remain cheap to branch/reorder/reject.

## 5.6 Shot

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
  target_seconds: 8.0        # creative target
  target_frames: 192         # exact production target once timing is established
  rate: { numerator: 24, denominator: 1 }
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

performances:
  - character_id: char_lan
    intention: "Hide fear; keep watching."
    action_beats:
      - "notices structural movement"
      - "freezes briefly"
      - "eyes shift to instruments"
    expression: restrained
    body_language: closed
    eyeline: "Fablestar, then instruments"
    blocking: "seated at forward console"
    voice_delivery: "none"
    continuity_notes: "Left glove remains damaged."

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

## 5.7 ReferenceSet

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
    authority: strong
    use_scope: camera_only
    priority: 60
    exclude_traits:
      - "source character identity"
      - "source environment"

  - asset_id: wav_lan_voice_master
    role: voice
    authority: locked
    use_scope: voice_only
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

Transfer/use-scope values are separate from authority:

- full
- identity_only
- appearance_only
- motion_only
- camera_only
- voice_only
- style_only
- composition_only
- audio_only

Keeping role, authority, and use scope separate prevents a renderer-specific reference concept from leaking into the project model and gives the H3 compiler explicit anti-bleed intent.

## 5.8 GenerationPacket

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

## 5.9 RenderJob

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

## 5.10 Take

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

## 5.11 AssemblyClip

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

## 5.12 AgentPatch

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

---

# Appendix — docs / product / professional-tools-baseline

_Source file: `docs/product/professional-tools-baseline.md`_

# Professional Tools Baseline v0.2

The product should feel AI-native without omitting ordinary tools creators expect. This checklist separates baseline craft tools from the new AI-native layer.

## WORLD / knowledge baseline
- Markdown editing/preview
- properties/frontmatter
- backlinks and unlinked mentions
- aliases/tags
- outline
- quick open/search
- templates
- bookmarks
- graph
- infinite canvas
- revision/recovery
- attachments/embeds
- safe rename/move

AI-native additions:
- context inspector
- canon/knowledge layers
- impact analysis
- patch-based agents
- research-to-canon staging

## STORY / writing baseline
- screenplay formatting and raw portable source
- scenes and scene numbers
- dialogue/action/parentheticals/transitions
- dual dialogue
- sections/synopses/notes/comments
- outline/index cards
- character dialogue filtering
- read-through/TTS audition
- revisions/branches

AI-native additions:
- scene state deltas
- truth vs character vs audience knowledge
- continuity diagnostics
- role-specific writing agents
- moment extraction for generative production

## BOARDS / animatic baseline
- panels/thumbnails
- captions: dialogue/action/timing/notes
- panel and scene duration
- ripple/non-ripple timing changes
- camera pan/zoom planning
- layer/markup annotations
- audio placement/waveform/scrubbing
- playback ranges/loop/frame stepping
- transitions
- shot/scene IDs and burn-ins

AI-native additions:
- Moment -> visual alternatives
- generate-around-selected-board
- semantic reference inheritance
- first/last-frame promotion
- board -> renderer-neutral Shot

## STUDIO / shot baseline
- shot list and status
- frame/aspect/safe-area guides
- camera/performance notes
- references
- render queue
- versions/takes
- A/B comparison
- timecoded review notes
- lineage

AI-native additions:
- semantic references with authority
- renderer mode recommendation/preflight
- prompt compilation
- multimodal generation packet
- continuation chaining
- resource-aware batching

## CUT / editorial baseline
- viewer
- frame-accurate timeline
- insert/overwrite
- trim/ripple trim
- split/delete/ripple delete
- snapping
- tracks/gaps
- simple transitions
- markers
- waveform/audio scrubbing
- basic gain/fades
- proxy/full-res switch
- version/take switching
- review burn-ins
- export preflight

AI-native additions:
- board placeholders that later resolve to approved Takes
- source Shot jump-back
- generation lineage from timeline clip
- regenerate/fix-request from editorial context
- continuity advisories across the current cut

## Production infrastructure baseline
- stable IDs
- checksums
- autosave/recovery
- immutable source media + derived media lineage
- proxy generation
- media relink
- frame-rate/timebase policy
- color metadata/management path
- export manifests
- structured review notes
- logs that are useful but secret-scrubbed

## VISUAL DEVELOPMENT / image-work baseline
- mood/reference boards and contact sheets
- compare 2-up / 4-up / flicker between variants
- crop/reframe and aspect/safe-area preview
- non-destructive annotation/paint-over layer for notes, arrows, masks, and composition guides
- promote an image to identity/style/environment/prop/board/keyframe role without duplicating the source
- duplicate/branch visual directions
- preserve prompt/settings/seed/workflow lineage for generated media
- quick reject/hold/approve/rating states
- detect missing/offline source files and relink
- export selected references/boards as a review sheet

AI-native additions:
- generate variations around a selected composition rather than starting from a blank prompt
- identify which canon/reference constraints a candidate appears to violate (advisory, not automatic rejection)
- infer reusable reference roles but require creator confirmation before changing authority
- suggest missing turnarounds, expressions, environments, props, or motion references required by upcoming shots

## REFERENCES / asset-library baseline
- ordinary folders remain visible, but metadata views are first-class
- search/filter by type, entity, scene, role, status, source, model, workflow, date, and usage
- thumbnails/proxies for images/video/audio
- inspect technical media metadata
- stable asset IDs + checksum/duplicate detection
- aliases/collections/smart collections
- usage/backlink view: every scene/shot/take/cut that consumes the asset
- immutable source/original distinction from derived media
- bulk tag/status/reference-role operations with undo/recovery
- relink and missing-media report

AI-native additions:
- semantic ReferenceSet inheritance from character/location/scene to Shot
- separate reference `role`, preservation `authority`, and transfer `use_scope`
- reference-budget/preflight view for H3 and future renderers
- anti-bleed exclusions such as “motion only; do not transfer subject/environment”
- reusable camera-motion, acting, expression, ambience, and voice libraries

## AUDIO / performance baseline
- dialogue/VO/SFX/music/ambience classifications
- waveform, audition, scrub, in/out selection, gain and fades
- clip lock/mute/solo in CUT where appropriate
- temporary/read-through voice versus approved voice distinction
- voice/reference provenance and consent/rights note fields
- room tone/ambience continuity notes
- export/replace audio without breaking linked Shot/Take identity

AI-native additions:
- H3 native audiovisual generation represented as one Take while still exposing replaceable audio during CUT
- semantic voice/timbre reference role with explicit transfer scope
- dialogue exact-text lock so a video prompt compiler cannot casually paraphrase authored lines
- optional TTS/read-through generation that never automatically becomes final dialogue

## REVIEW / production-management baseline
- statuses, assignee/owner field, priority, due/target date where desired
- timecoded notes and frame grabs
- approve / reject / hold / needs-fix states
- compare versions/takes while preserving review history
- scene/sequence/shot progress views
- dependency/blocker visibility
- export review manifest/burn-ins
- activity history for meaningful project changes

AI-native additions:
- Production Assistant can surface blocked/missing work but cannot mark creative work approved
- continuity/canon warnings attach to the exact scene/shot/take and can be accepted, dismissed with reason, or converted to a task
- generation-cost/resource estimates remain advisory and are separated from creative approval

---

# Appendix — docs / product / e2e-user-flows

_Source file: `docs/product/e2e-user-flows.md`_

# End-to-End User Flows

## Flow A — Blank world to first scene
1. Create local project.
2. WORLD opens with starter templates and no forced cloud login.
3. Create Character and Location notes.
4. Link notes and add typed relation.
5. Graph/backlinks update.
6. STORY: create Fountain screenplay + Scene Capsule.
7. Add scene start/end state and knowledge change.
8. Agent can suggest prose but writes remain patch-reviewed.

## Flow B — Scene to boards
1. Open Scene Lab.
2. Select beat; create/AI-suggest Moments.
3. Send Moment to STUDIO Explore.
4. Choose entity/location references inherited from canon.
5. Generate multiple concept images via registered ComfyUI workflow.
6. Compare and promote candidate to storyboard panel.
7. Set panel duration and captions; preview animatic.

## Flow C — Board to H3 shot
1. Convert selected panel/Moment to Shot.
2. Shot inherits scene state, characters, location, reference defaults.
3. Creator edits performance/camera/audio.
4. Reference Resolver labels identity/costume/environment/motion/voice roles.
5. H3 mode router recommends I2VA/FL2VA/Ref2VA with explanation.
6. Preflight checks duration, resolution, reference count/type and configured backend authorization.
7. Show Director Notes and compiled prompt preview.
8. Queue render.

## Flow D — Render to approved take
1. Render Queue receives ComfyUI progress over adapter.
2. Output ingested to Media with checksum and lineage.
3. Take appears in comparison view.
4. Creator A/B compares, annotates, approves.
5. Shot default take changes; prior takes remain.

## Flow E — Continue shot
1. Select approved Take → Continue.
2. Tool extracts selected ending frame and creates continuation segment/shot.
3. Inherit refs/state/location/costume; creator can override.
4. H3 compiler treats frame as first-frame/keyframe according to chosen mode.
5. Lineage links both clips.

## Flow F — Assembly
1. CUT can begin with board panels before final videos exist.
2. Approved take replaces board media while preserving clip/shot identity.
3. Duration mismatch is shown and user chooses trim/ripple/keep timeline allocation.
4. Add VO/SFX/music, markers and fades.
5. Export review MP4 with burn-ins; later export OTIO/manifest.

## Flow G — Canon changes late
1. Creator edits character costume fact from a scene onward.
2. Canon change is saved.
3. Impact analysis lists linked scenes/shots/reference sets/takes.
4. Nothing is regenerated automatically.
5. Creator can bulk-create fix tasks or selectively update shots.

## Flow H — Local-first agent routing
1. Project privacy set LOCAL_ONLY.
2. Canon Keeper uses LM Studio/Ollama if capability requirements met.
3. If local model lacks required vision/tool capability, request fails with actionable message.
4. App never silently sends project context to a cloud model.

---

# Appendix — docs / product / screen-map

_Source file: `docs/product/screen-map.md`_

# Screen Map v0.2

This is the first implementation map for navigation. Names are product concepts, not browser URL requirements; Tauri may use internal route IDs.

## Persistent shell

- Project switcher / recent projects
- Workspace switcher: WORLD | STORY | STUDIO | CUT
- Breadcrumbs / active object
- Global Quick Open
- Command Palette
- Context/Agent drawer
- Project Health indicator
- Render Queue indicator
- Activity/Recovery

## WORLD

### `world.note`
Primary Markdown editor/reader.
Right inspector tabs: Properties | Links | Relations | Timeline | References | Context.
Bottom optional: Diff/History | Search results | Agent patches.

### `world.view`
Saved table/list/card view over note properties.

### `world.graph`
Automatic knowledge graph with global/local focus, filters, path finder, orphans.

### `world.canvas`
Manual creative canvas based on JSON Canvas-compatible storage where possible.

### `world.timeline`
Chronological world timeline, not editorial timeline.

### `world.research`
Research inbox/staging. Nothing promotes to canon automatically.

## STORY

### `story.screenplay`
Fountain editor + formatted preview + navigator.

### `story.outline`
Act/sequence/scene cards and list views.

### `story.scene-lab`
Selected scene + Scene Capsule + state/reveal lane + Beats/Moments + contextual agent.

### `story.branch-compare`
Compare screenplay/state consequences between alternative branches.

### `story.readthrough`
Dialogue-focused read-through/temporary voice audition.

## STUDIO

### `studio.explore`
Visual development canvas. Fast/temporary by default.

### `studio.boards`
Storyboard/animatic workspace with panel strip, stage/viewer, captions, timing, audio, annotations.

### `studio.shots`
Shot list + Shot Designer + reference resolver + renderer preflight/compiled packet inspector.

### `studio.takes`
Take comparison, synchronized playback, A/B, review notes, approve/hold/reject, continuation.

### `studio.library`
Asset/reference browser with lineage, roles, authority, status, metadata, relink.

### `studio.render-queue`
May appear as full view or bottom drawer: dependencies, grouping, backend, progress, logs, retries.

## CUT

### `cut.timeline`
Viewer + timeline + bin + clip inspector/review notes.

### `cut.review`
Fuller review/presentation mode with comments/burn-in options.

### `cut.export`
Preset + preflight + render/export progress + manifest output.

## SETTINGS

### `settings.project`
Project defaults: frame rate, aspect, color policy, storage paths, naming, privacy, default renderer.

### `settings.ai`
Provider profiles, models, routing presets, agent profiles, usage/cost controls.

### `settings.renderers`
ComfyUI connections, workflow registry, H3/other renderer capability profiles and compliance/licensing configuration.

### `settings.resources`
Writing/Render/Balanced/Manual workstation resource policy.

### `settings.security`
Permissions, external tools, diagnostics/redaction, network policy.

## Contextual modal/panel surfaces

Prefer these over additional permanent tabs:
- Create Entity
- Create Scene/Shot
- Reference Picker
- Reference Mapping Preview
- H3 Preflight
- Compiled Prompt / Generation Packet
- Workflow Adapter Registration/Remap
- Agent Patch Diff
- Canon Impact Analysis
- Media Relink
- Take Fix Request
- Export Preflight
- Project Recovery

---

# Appendix — docs / architecture / service-boundaries

_Source file: `docs/architecture/service-boundaries.md`_

# Service Boundaries v0.2

## Rule
UI code may orchestrate user interaction but must not own persistence rules, provider payloads, render mappings, or canonical state logic. External integrations sit behind ports/adapters.

## Core services

### ProjectService
Responsibilities: create/open/close project, resolve root, load project config, project lock, backup before migration.
Key operations:
- `createProject(template)`
- `openProject(path)`
- `closeProject()`
- `getProjectInfo()`
- `backupProject(reason)`

### VaultService
Responsibilities: safe relative-path file operations for authored project files.
- read/write Markdown/Fountain/YAML/JSON Canvas
- atomic writes
- rename/move with link-update transaction
- file watcher normalization
- snapshots/recovery hooks
Never accepts arbitrary unrestricted OS paths from renderer/agent payloads.

### SchemaService
- validate durable objects/frontmatter
- report human-readable schema errors
- migrate supported versions
- expose schema registry/version

### IndexService
- rebuildable SQLite index
- parse/update note metadata and links
- track file hash/mtime
- full rebuild and incremental update

### SearchService
- FTS queries
- typed filters
- result snippets
- optional semantic provider later

### GraphService
- graph projection from wikilinks + typed relations
- neighborhoods, path finding, orphans
- does not mutate canon directly

### ViewQueryService
- saved property queries/table/card/list views
- filters/sorts/groups/formulas supported by our own documented query language
- edits delegate to Vault/Schema services

### StoryService
- Fountain parse/render mapping
- acts/sequences/scenes/beats/moments CRUD
- stable scene ID reconciliation
- branch/compare operations

### StateService
- scene state snapshots/deltas
- physical/prop/costume state
- chronology validation
- state-at-scene calculation

### KnowledgeService
- truth/belief/audience knowledge records
- reveal timing
- character knowledge queries

### ContextService
Builds bounded agent context from current selection, links, state, story neighborhood, and explicit user additions.
Must return a visible `ContextManifest` of included sources and destination privacy class.

### AgentService
- agent profiles
- tool registry/permissions
- request orchestration
- patch proposal validation
- stale patch detection
Never writes durable canon directly unless explicit auto-apply policy permits the exact operation.

### ModelGateway
Normalizes OpenAI, Anthropic, OpenRouter, Ollama, LM Studio, generic-compatible providers.
- model discovery where supported
- capability profiles
- routing policy
- streaming
- structured output/tool calling normalization
- usage/cost metadata where available
- privacy destination enforcement

### AssetService
- ingest/import/generated media
- stable asset IDs
- checksums/probe metadata
- lineage links
- immutable-original policy
- duplicate detection

### ReferenceService
- reference sets
- semantic roles/authority
- inheritance from entities/scenes
- conflict detection
- renderer-specific budgeting via resolver adapters

### WorkflowRegistry
- register ComfyUI workflow + semantic mapping
- workflow hash/version
- validate required node/class/field contracts
- mark incompatible on drift

### ComfyUIAdapter
- connection health
- submit API workflow
- WebSocket progress/events
- history/output retrieval
- output ingestion handoff
No domain rules or H3 prompt construction.

### H3CompilerService
- H3 capability/preflight
- mode routing
- duration/resolution resolution
- reference ordering/tags
- base vs full-reference prompt compilation
- compiler version + golden tests
Returns renderer-specific payload attached to a renderer-neutral GenerationPacket.

### RenderQueueService
- persistent jobs
- dependencies
- retry/cancel/pause
- backend scheduling
- family batching hints
- completion events

### ResourceCoordinator
- aggregate resource hints from local render/model/media backends
- serialize or defer known heavyweight local tasks according to user policy
- coordinate optional local-model unload/reload through provider adapters
- expose writing/render/balanced/manual policies
- record automatic resource actions in Activity
Does not terminate arbitrary processes and does not own provider-specific APIs.

### MediaService
- ffprobe metadata
- proxies/thumbnails/frame grabs
- waveform data
- safe FFmpeg command construction
- export render helpers
Never accepts arbitrary shell fragments.

### ReviewService
- notes/status/ratings
- timecoded comments
- approve/reject/hold
- shot default take selection

### TimelineService
- OTIO-backed sequence editing subset
- clip/track/marker operations
- board-to-take replacement
- take switching
- autosave/recovery

### ExportService
- review/master/export presets
- OTIO writing
- manifest generation
- preflight

### ProjectHealthService
Aggregates validator findings from schema, links, media, adapters, providers, patches, and continuity.

### SecretsService
Only interface for API keys/tokens. Backed by Tauri/OS secure storage. Never returns secrets to renderer logs or project serialization.

### SettingsService
App/project settings with typed scopes and migrations.

### EventBus
Typed internal events. Events contain IDs and safe metadata, not secrets or entire document bodies unless explicitly required.

## Dependency direction

UI → application services → domain → ports → infrastructure adapters.

Infrastructure adapters may depend on vendor SDKs. Domain objects must not.

Forbidden examples:
- React component calling OpenRouter directly.
- Shot schema storing ComfyUI node ID 42.
- World note storing H3 `<Picture 1>` syntax as source of truth.
- Agent service calling filesystem without VaultService validation.

## Minimum event contracts
- `project.opened`
- `vault.file.changed`
- `index.updated`
- `selection.changed`
- `canon.changed`
- `story.scene.changed`
- `state.changed`
- `asset.ingested`
- `reference_set.changed`
- `render.queued`
- `render.progress`
- `render.completed`
- `render.failed`
- `take.status.changed`
- `timeline.changed`
- `project_health.changed`

Every event contract must be documented and versioned if persisted or exposed externally.

---

# Appendix — docs / architecture / application-api-contracts

_Source file: `docs/architecture/application-api-contracts.md`_

# Application API Contracts v0.2

This document defines the **shape of service boundaries**, not final language syntax. TypeScript/Rust implementations should preserve these responsibilities.

## Common result/error contract

Service calls should return typed domain errors rather than raw vendor exceptions.

Representative error classes:
- `ValidationError`
- `NotFoundError`
- `ConflictError`
- `StaleRevisionError`
- `PermissionDeniedError`
- `PrivacyPolicyError`
- `CapabilityUnsupportedError`
- `ProviderUnavailableError`
- `RendererIncompatibleError`
- `MediaOfflineError`
- `MigrationRequiredError`
- `CancelledError`

Errors carry safe structured details and remediation hints; secrets/vendor payload dumps are excluded by default.

## Project/Vault

```ts
ProjectService.createProject(input): ProjectInfo
ProjectService.openProject(path): ProjectSession
ProjectService.backupProject(reason): BackupRecord
ProjectService.closeProject(): void

VaultService.readText(relativePath): TextDocument
VaultService.writeTextAtomic(relativePath, content, expectedRevision?): Revision
VaultService.renamePath(from, to, linkPolicy): RenamePlanResult
VaultService.snapshot(target, reason): SnapshotRecord
```

All paths crossing the frontend boundary are project-relative handles where possible.

## Search/Graph/Views

```ts
SearchService.search(query, filters, page): SearchPage
GraphService.getNeighborhood(entityId, depth, filters): GraphProjection
GraphService.findPaths(fromId, toId, options): GraphPath[]
ViewQueryService.execute(viewId, context): ViewResult
ViewQueryService.patchProperty(entityId, property, value, expectedRevision): Revision
```

## Story/State/Knowledge

```ts
StoryService.parseScreenplay(documentId): ScreenplayParse
StoryService.reconcileScenes(parse, priorSceneMap): SceneReconciliation
StoryService.createBranch(scopeId, name): BranchId
StoryService.promoteBranch(branchId, strategy): ChangePlan

StateService.computeStateAt(sceneId): StateSnapshot
StateService.applySceneDelta(sceneId, delta, expectedRevision): StateSnapshot
StateService.validateChronology(scope): Diagnostic[]

KnowledgeService.getCharacterKnowledge(characterId, sceneId): KnowledgeSnapshot
KnowledgeService.getAudienceKnowledge(sceneId): KnowledgeSnapshot
KnowledgeService.validateRevealOrdering(scope): Diagnostic[]
```

## Context/Agents

```ts
ContextService.buildManifest(request): ContextManifest
ContextService.estimateBudget(manifest, modelProfile): ContextBudget

AgentService.run(agentId, task, contextManifestId, options): AgentRun
AgentService.proposePatch(runId): AgentPatch
AgentService.applyPatch(patchId, selections, expectedRevisions): PatchApplyResult
AgentService.rejectPatch(patchId, reason?): void
```

No agent write API bypasses revision validation/permissions.

## Model Gateway

```ts
ModelGateway.listProviders(): ProviderProfile[]
ModelGateway.refreshModels(providerId): ModelProfile[]
ModelGateway.route(capabilityRequest, policy): RouteDecision
ModelGateway.generate(request, route): Stream<ModelEvent>
ModelGateway.cancel(requestId): void
```

Provider-specific model-load APIs live behind optional management interfaces and ResourceCoordinator policy.

## Assets/References

```ts
AssetService.importFile(pathHandle, metadata): Asset
AssetService.ingestGenerated(renderJobId, output): Asset[]
AssetService.createDerived(parentIds, operation, output): Asset
AssetService.findRelinkCandidates(assetId): RelinkCandidate[]

ReferenceService.resolve(referenceSetId, shotId, rendererProfile): ResolvedReferences
ReferenceService.validate(referenceSetId, targetCapabilities): Diagnostic[]
```

## Workflow/ComfyUI

```ts
WorkflowRegistry.register(workflowJson, semanticMapping, metadata): WorkflowAdapter
WorkflowRegistry.validate(adapterId, backendCapabilities): AdapterCompatibility
WorkflowRegistry.createVersion(adapterId, changes): WorkflowAdapter

ComfyUIAdapter.probe(connectionId): ComfyCapabilities
ComfyUIAdapter.submit(renderJob, apiWorkflow): BackendJobRef
ComfyUIAdapter.events(backendJobRef): Stream<BackendRenderEvent>
ComfyUIAdapter.reconcile(backendJobRef): BackendJobState
ComfyUIAdapter.interrupt(backendJobRef): void
```

The application service using ComfyUI owns retry policy and output ingestion; the adapter owns vendor protocol translation.

## H3 Compiler

```ts
H3CompilerService.preflight(shot, refs, profile, capabilities): H3Preflight
H3CompilerService.recommendMode(input): H3ModeRecommendation
H3CompilerService.resolveTiming(targetDuration, capabilities): ResolvedTiming
H3CompilerService.resolveReferences(refs, capabilities): H3ReferenceMapping
H3CompilerService.compile(input): CompiledRendererPayload
```

Compiler output is versioned and attached to a GenerationPacket; it does not mutate the Shot.

## Render Queue/Resources

```ts
RenderQueueService.enqueue(packetId, options): RenderJob
RenderQueueService.cancel(jobId): void
RenderQueueService.retry(jobId): RenderJob
RenderQueueService.setPriority(jobId, priority): void
RenderQueueService.reconcile(): ReconcileReport

ResourceCoordinator.evaluate(job): ResourcePlan
ResourceCoordinator.prepare(plan): ResourceAction[]
ResourceCoordinator.restore(plan): ResourceAction[]
```

Resource actions are auditable and policy-bound.

## Review/Timeline/Export

```ts
ReviewService.addNote(target, time, text): ReviewNote
ReviewService.setTakeStatus(takeId, status): Take
ReviewService.setDefaultTake(shotId, takeId): ShotTakeSelection

TimelineService.insertShot(sequenceId, shotId, at): AssemblyClip
TimelineService.setTake(clipId, takeId): AssemblyClip
TimelineService.trim(clipId, range, mode): TimelineChange
TimelineService.split(clipId, at): TimelineChange
TimelineService.mark(sequenceId, timeRange, note): Marker

ExportService.preflight(sequenceId, presetId): ExportPreflight
ExportService.export(sequenceId, presetId): ExportJob
```

## Event-driven invalidation

Services publish typed events. Consumers should invalidate/recompute derived views rather than tightly coupling service calls.

Examples:
- canonical note changed -> index + graph + impact diagnostics dirty
- scene state changed -> downstream continuity dirty
- reference set changed -> affected GenerationPackets stale, existing Takes remain immutable
- workflow adapter version changed -> new jobs use new version; historical jobs retain old adapter metadata
- approved take changed -> CUT offers/auditions update but does not silently replace locked editorial choices unless configured

---

# Appendix — docs / architecture / event-contracts

_Source file: `docs/architecture/event-contracts.md`_

# Internal Event Contract Rules

1. Events identify objects by stable ID, not filename/display title.
2. Event payloads are minimal and serializable.
3. No API keys, provider auth headers, raw hidden prompts, or unrestricted file paths in event logs.
4. UI may optimistically update only where service contract supports rollback/reconciliation.
5. File-watcher events are debounced/coalesced before expensive reparsing.
6. Derived events must be idempotent where possible.
7. Long-running jobs expose correlation/job IDs.
8. Event names use `domain.action` form and are documented before cross-module use.

---

# Appendix — docs / architecture / resource-coordinator

_Source file: `docs/architecture/resource-coordinator.md`_

# Resource Coordinator v0.2

The workstation may run ComfyUI, local LLMs, video decoding, FFmpeg, and indexing on the same hardware. Resource arbitration must be explicit rather than hidden inside individual adapters.

## Responsibilities

`ResourceCoordinator` may:
- collect GPU/RAM hints from ComfyUI and local model providers
- track active render/inference/transcode work
- expose user-configurable priorities
- request an idle local LLM provider to unload a model when policy permits
- delay/reorder background jobs to avoid destructive resource thrashing
- restore/reload a previously active local model after a render when configured

It must not promise exact VRAM availability from estimates.

## Profiles

- **Writing Priority** — keep local LLM loaded; render queue waits when necessary.
- **Render Priority** — allow configured local LLM auto-eviction before heavy render jobs.
- **Balanced** — serialize known heavyweight operations and preserve interactive tasks.
- **Manual** — warn only; creator decides.

## Safety

Auto-unload/reload is opt-in per local provider. Never terminate unrelated processes. Never treat cloud providers as local resource consumers. Record automated unload/reload actions in Activity.

---

# Appendix — docs / agents / model-gateway

_Source file: `docs/agents/model-gateway.md`_

# Model Gateway v0.2

The application supports local and cloud inference through one capability-aware gateway. Agents never call vendor SDKs directly.

## Provider adapters

First-party adapters:
- OpenAI
- Anthropic
- OpenRouter
- Ollama
- LM Studio
- Generic OpenAI-compatible

Companion/interoperability targets:
- LM Studio LM Link for remote-device execution behind the normal local LM Studio API surface
- LM Studio Bionic as a separate external agent application working against the open project folder and, later, project MCP tools

Bionic is **not** an inference provider adapter.

## Normalized request contract

The application-level request describes intent/capabilities rather than vendor payloads:
- messages/input
- requested agent role
- multimodal inputs
- requested structured-output schema
- tool set + permission class
- reasoning preference where meaningful
- streaming preference
- context budget
- privacy class
- cost/latency preference
- fallback policy
- cancellation token

A provider adapter translates this to the vendor's current API contract and normalizes stream/results/tool calls/usage/errors back into internal types.

Do not force every provider through the lowest common denominator. The internal contract may expose optional capability extensions while preserving common behavior.

## Capability model

Each discovered/configured model records known/unknown support for:
- text
- image/vision input
- audio input where supported
- tool/function calling
- structured/JSON-schema output
- reasoning controls
- embeddings
- streaming
- context limit
- maximum output limit where known
- remote MCP/tool support
- local/remote execution
- loaded/unloaded state where provider can report it
- approximate resource information where provider can report it

`unknown` is distinct from `false`.

Model names are not a reliable capability database. Prefer provider discovery/metadata, explicit user overrides, and capability probes. Cache results with a timestamp/version and allow refresh.

## Routing presets

### LOCAL_ONLY
- eligible providers: Ollama, LM Studio, configured local-compatible endpoints
- no cloud fallback under any error condition
- unsupported task returns a useful capability error

### LOCAL_FIRST
- try eligible local route first
- cloud fallback occurs only when the project/user policy explicitly allows that fallback class
- before the first cloud fallback for sensitive/project content, surface destination and policy unless prior consent covers it

### BALANCED
- use per-agent/task routing profiles optimized for quality/cost/resource use
- privacy constraints always override cost/quality preferences

### BEST_QUALITY
- use preferred high-quality routes subject to privacy/provider policy
- does not mean “send everything to cloud” when project privacy forbids it

### CUSTOM
- explicit per-agent/per-task/model/provider rules

## RouteDecision

Every request records non-secret routing evidence:
- request/agent ID
- required capabilities
- selected provider/model
- route preset
- local/cloud destination class
- fallback chain permitted
- privacy constraints
- model capability-profile version
- reason for selection
- usage/cost metadata when returned
- timestamps

Do not store raw API keys, authorization headers, or hidden provider credentials in route logs.

## Provider notes

### OpenAI
Use the current Responses API for new agentic/multimodal integrations when it fits the task. Normalize tool calls and structured outputs behind the gateway. Provider-specific built-in tools are optional extensions; the project must remain usable without them.

### Anthropic
Use the current Messages API/tool-use contract behind the adapter. Keep Claude-specific content-block/tool semantics out of domain objects.

### OpenRouter
OpenRouter is a distinct adapter even though it is OpenAI-compatible because routing/privacy are product-relevant features.

Expose advanced policy options such as:
- provider allow/deny/order
- provider fallback permission
- model fallback list
- data-collection policy
- Zero Data Retention requirement where supported
- cost/latency/throughput preference

App-level privacy policy wins over OpenRouter defaults. If the app says no fallback or LOCAL_ONLY, the adapter must not broaden the route.

### Ollama
Use its OpenAI-compatible API where sufficient. Current compatibility includes Chat Completions and Responses, with tool/function use supported for capable models.

Ollama-specific APIs may be used for richer local discovery/management only inside the adapter.

### LM Studio
LM Studio currently provides OpenAI-compatible Responses/Chat/Embeddings/Completions and an Anthropic-compatible Messages endpoint, plus a native REST API for richer model management.

Initial integration:
1. OpenAI-compatible inference/discovery
2. structured output/tool normalization
3. native API optional layer for load/unload/download/status/resource metadata

LM Link should be transparent to the rest of the app: the configured local LM Studio API may route execution to another linked machine.

### Generic OpenAI-compatible
Provide configurable:
- base URL
- auth mode
- model ID
- known capability overrides
- request timeout

Never assume “OpenAI-compatible” means every Responses/tool/vision feature exists. Capability probe or explicit configuration is required.

## Structured output rule

For durable structured proposals:
1. request provider-level structured output/JSON schema when supported
2. parse returned data defensively
3. validate again locally with the authoritative project JSON Schema
4. convert to a reviewable domain patch

Provider validation never replaces local validation.

## Tool permission classes

Suggested classes:
- `READ_PROJECT`
- `READ_EXTERNAL`
- `PROPOSE_PROJECT_CHANGE`
- `WRITE_LOW_RISK_APPROVED_SCOPE`
- `RENDER_JOB`
- `PROCESS_MEDIA`
- `NETWORK_EXTERNAL`
- `DESTRUCTIVE`
- `SECURITY_SETTINGS`

Agents receive the minimum tool set for their role/task. A model's request to call a tool does not grant permission by itself.

## Cost/resource controls

Track estimated/actual usage where providers expose it. Permit project/user budgets and warning thresholds.

Local inference shares workstation resources with ComfyUI. Resource behavior belongs to `ResourceCoordinator`; ModelGateway may expose load/unload requests but must not independently evict models based on hidden heuristics.

## Failure policy

Classify failures:
- unavailable provider
- unsupported capability
- context overflow
- authentication
- rate limit
- policy/privacy violation
- malformed structured result
- tool failure
- cancellation

Fallback is allowed only when the configured policy permits the **new provider/model and privacy class**. Never turn a privacy/policy failure into an automatic broader fallback.

## Tests

Provider contract fixtures should cover:
- streaming normalization
- cancellation
- tool calls
- structured output
- malformed payloads
- rate-limit/retry classification
- capability mismatch
- local-only route failure
- cloud fallback consent/policy
- model discovery refresh
- secret scrubbing

Do not make live paid API calls a mandatory unit-test requirement. Use recorded/synthetic contract fixtures and optional integration tests gated by environment configuration.

---

# Appendix — docs / agents / context-patch-system

_Source file: `docs/agents/context-patch-system.md`_

# Context & Patch System

## Context Manifest
Every agent request produces a manifest visible on demand:
- active object/selection
- included notes/scenes/entities
- state snapshots
- references/assets included
- retrieval queries used
- excluded sensitive/private scopes
- destination provider/model and local/cloud class
- truncation/summarization notes

The model sees only the assembled context, not unrestricted project access, unless a tool call is explicitly granted.

## Patch workflow
1. Read target and hash/version.
2. Agent returns structured proposal.
3. Validate proposal against allowed operation types.
4. Present human-readable diff and impact summary.
5. On apply, re-check target hash.
6. If stale: refuse blind apply and offer rebase/re-run.
7. Apply atomically through Vault/Story/State service.
8. Record activity and resulting hash.

## Patch operation classes
Low risk: tag, alias, scratch-summary.
Medium: normal prose, research note, non-canon metadata.
High: canon fact, screenplay, state/reveal, production status, file move/delete, provider/security settings.
High-risk operations default to explicit review.

## Change impact
For canon/state edits, ask dependency services for affected entities, scenes, moments, shots, refs, and approved takes. Impact analysis is advisory; it does not automatically regenerate assets.

---

# Appendix — docs / agents / mcp-interoperability

_Source file: `docs/agents/mcp-interoperability.md`_

# MCP Interoperability v0.2

MCP is an interoperability/tool boundary, not the application's model-routing layer.

Research baseline: MCP specification `2026-07-28`.

## Design direction

Build the application's own agents against `ModelGateway` directly. Do not rely on deprecated MCP Sampling for LLM inference.

Later, expose a controlled project MCP server so external agent applications can work with the project without bypassing domain rules.

Potential tools:
- `search_world`
- `read_entity`
- `read_scene`
- `get_scene_state`
- `get_character_knowledge`
- `search_assets`
- `get_reference_set`
- `get_shot`
- `propose_patch`
- `create_noncanon_note`
- `create_scene_branch`
- `queue_render` (permissioned)
- `get_render_status`

## Current protocol considerations

The 2026-07-28 specification moved to a stateless core and deprecated Roots, Sampling, and Logging for new designs. Use direct provider integration for model calls, explicit tool parameters/resource URIs for project scope, and normal application observability rather than building new architecture on those deprecated surfaces.

Tool schemas should use JSON Schema 2020-12 and remain bounded/validated locally.

## Safety

- MCP callers receive the same authorization/domain validation as the native UI.
- Never expose a raw arbitrary filesystem write tool.
- Prefer stable object IDs and project-relative resource handles.
- Canon-changing operations return proposals by default.
- Destructive/render/network operations require permission classes.
- External callers cannot bypass LOCAL_ONLY/cloud/privacy settings.
- Audit tool invocations without storing secrets.

---

# Appendix — docs / render / comfyui

_Source file: `docs/render/comfyui.md`_

# ComfyUI Integration Contract v0.2

ComfyUI is a render/inference backend, not the application's project model or primary user interface.

Research baseline checked 2026-08-09 against the official ComfyUI server/API documentation.

## Architectural boundary

The application owns renderer-neutral production objects:

`Shot -> ReferenceSet -> GenerationPacket -> RenderJob -> Take`

The ComfyUI integration translates a `GenerationPacket` into a **versioned API-format workflow** and translates ComfyUI execution/output events back into `RenderJob`, `Asset`, and `Take` records.

Core domain code MUST NOT reference ComfyUI node IDs, widget indices, class names, or filesystem conventions.

## Connection profile

A ComfyUI connection profile stores:
- stable connection ID
- display name
- base URL
- WebSocket URL if not derived
- local/remote classification
- authentication configuration if applicable
- timeout/retry policy
- capability snapshot timestamp
- optional device label

Default local endpoint may be discovered/configured as `127.0.0.1:8188`, but do not assume it is always local or unauthenticated.

## Official server surfaces used

The adapter may use the documented endpoints below, guarded by capability/version probing:

- `POST /prompt` — validate and submit the full workflow; capture `prompt_id`, queue number, validation errors and node errors.
- `GET /prompt` — current queue/execution status when useful.
- `WS /ws` — real-time execution/status/progress/error events.
- `GET /history/{prompt_id}` — authoritative execution/output history for a submitted job.
- `GET /queue` — queue state.
- `POST /queue` — supported queue management operations.
- `POST /interrupt` — interrupt active execution when the user's intent maps safely to this operation.
- `GET /system_stats` — runtime/device/VRAM information for diagnostics/resource hints.
- `GET /features` — backend feature discovery.
- `GET /object_info` / `GET /object_info/{node_class}` — node contract discovery/validation.
- model/workflow-template endpoints may be used for diagnostics/discovery, not as hidden dependencies for project validity.

The application must tolerate endpoint/capability differences across ComfyUI versions and hosted backends. Probe; do not guess.

## WebSocket event normalization

Normalize backend events into internal render events such as:
- `render.queued`
- `render.started`
- `render.progress`
- `render.node_started`
- `render.node_output`
- `render.cached`
- `render.failed`
- `render.interrupted`
- `render.completed`

Official ComfyUI event types currently include `status`, `execution_start`, `execution_cached`, `executing`, `progress`, `executed`, `execution_error`, `execution_interrupted`, and `execution_success`.

Do not equate an `executed` event with whole-job completion. Final completion is determined from the job lifecycle/history/success signal.

## Workflow Adapter

A workflow adapter binds semantic production inputs to exact fields in a known workflow.

Example conceptual mapping:

```yaml
id: h3_ref2va_v1
renderer: comfyui
workflow_file: workflows/h3_ref2va_api.json
workflow_sha256: ...
requirements:
  comfyui_min_version: ...
  node_classes:
    - ...
inputs:
  prompt:
    node_id: "37"
    input: text
  duration_frames:
    node_id: "45"
    input: length
  first_frame:
    node_id: "16"
    input: image
outputs:
  video:
    node_id: "81"
```

The real adapter format is governed by `schemas/workflow-adapter.schema.json`.

### Registration

When a workflow is registered:
1. store canonical API-format workflow JSON
2. hash it
3. inspect required node classes
4. validate semantic mappings against current `object_info`
5. identify expected output nodes
6. record adapter version
7. run a fixture/contract validation
8. mark compatible/incompatible with reason

### Drift behavior

If the workflow hash, mapped node, class, or input contract changes:
- DO NOT guess a replacement node
- DO NOT silently modify the adapter
- mark adapter `INCOMPATIBLE`
- show the changed/missing mapping
- allow explicit re-map/re-registration
- create a new adapter version when accepted

This protects production projects from custom-node/workflow drift.

## Semantic input mapping

UI/domain terms remain semantic, for example:
- prompt
- negative prompt
- seed
- width/height
- first frame
- last frame
- identity references
- camera-motion reference
- voice reference
- duration
- quality profile

A renderer-specific compiler/adapter maps those terms to node inputs only at the boundary.

## Asset staging

When the workflow requires an input file:
1. validate the project asset exists and checksum matches expectation where appropriate
2. prepare renderer-safe filename/path
3. upload/copy through the supported adapter path
4. record the exact staged renderer reference in the RenderJob only
5. never rewrite the canonical project asset path to a ComfyUI-specific path

Generated outputs are ingested as immutable source assets with lineage; later transcoding/proxy/upscale outputs are derived assets.

## Queue behavior

The application queue is the user-facing source of job intent and dependency order. ComfyUI's queue is an execution backend queue.

The app must track:
- local job ID
- ComfyUI `prompt_id`
- workflow adapter/version/hash
- generation packet ID/hash
- attempts
- dependencies
- priority/group
- cancellation state
- timestamps
- backend status/progress
- output ingestion status

Retry creates a new attempt record. Do not erase evidence of a failed attempt.

## Resource-aware scheduling

Use `/system_stats` and configured renderer profiles as **hints**, not guarantees.

For heavy workflows such as H3:
- group compatible model-family jobs when possible
- permit queue pause before large model swaps
- expose resource warnings
- optionally coordinate with local LLM model unload/reload through a separate Model Gateway policy

The ComfyUI adapter must never directly unload an LLM provider. Cross-engine GPU arbitration belongs to a ResourceCoordinator service/policy.

## Open in ComfyUI

Every rendered job should provide an expert escape hatch:
- open/copy the exact workflow used
- show adapter version
- show generated semantic input mapping
- show prompt ID/history metadata

Manual work performed in ComfyUI is not automatically authoritative. If the user wants an edited workflow to become reusable, it must be explicitly registered/versioned as a new workflow adapter.

## Security and trust

Treat imported workflows and custom nodes as executable/untrusted integration material.

- Never auto-install custom nodes.
- Never run installer shell commands produced by an LLM without explicit user action and policy approval.
- Display missing node classes rather than attempting an automatic install.
- Validate/sanitize file paths and upload names.
- Do not expose arbitrary ComfyUI server filesystem paths to the frontend.
- Scrub secrets from captured workflow metadata/logs.
- Do not assume a remote ComfyUI endpoint is private merely because it uses a LAN address.

## Tests

Required adapter tests:
- workflow hash/registration fixture
- semantic mapping fixture
- missing-node failure fixture
- changed-input failure fixture
- `/prompt` validation-error normalization
- WebSocket event normalization
- interruption/failure/success lifecycle
- output ingestion/lineage
- reconnect after WebSocket loss
- job reconciliation from `/history/{prompt_id}` after app restart

H3 adapters additionally run H3 preflight and prompt/compiler golden tests before the workflow is submitted.

---

# Appendix — docs / render / minimax-h3

_Source file: `docs/render/minimax-h3.md`_

# MiniMax H3 Integration Contract v0.2

MiniMax H3 is the first-class video renderer but is not the project/domain model.

Research baseline checked 2026-08-09 against MiniMax H3 GitHub and native ComfyUI H3 docs.

## Current H3 capability profile

- Output duration: 4–15 seconds.
- Output frame rate: 24 fps.
- Native base target: 768px short edge; broader H3 system supports 2K regeneration.
- Native stereo audio: 32 kHz.
- FL2VA family: text, first-frame, last-frame, or first+last-frame generation.
- Ref2VA family: multimodal reference-driven generation with distinct weights.
- Ref2VA limits: ≤9 images, ≤3 videos, ≤3 standalone audio clips, ≤12 mixed files total; video/audio reference duration rules apply.
- In ComfyUI, H3 reference tags are positional (`<Picture 1>`, `<Video 1>`, `<Audio 1>`), and each reference should be assigned an explicit role.
- ComfyUI H3 duration snaps to the model's frame-block grid rather than arbitrary continuous seconds.
- `ref_image_size=match` prioritizes speed; `max` preserves higher reference detail at more cost.

Treat these as a versioned capability profile, not hard-coded constants scattered through UI code.

## Compiler inputs

- Shot
- Scene/Moment
- StateSnapshot
- ReferenceSet
- selected boards/keyframes
- project visual/camera rules
- exact authored dialogue
- sound/music intent
- render profile
- current H3 capability profile

## Mode routing

Default recommendation logic:

1. semantic identity/style/motion/camera/voice references → Ref2VA
2. first + last keyframes → FL2VA
3. first frame → I2VA/FL2VA family
4. last frame only when supported/desired → L2VA behavior
5. otherwise → T2VA

The router returns a recommendation and explanation. Creator may override if preflight remains valid.

## Reference resolver

Input semantic refs are renderer-neutral. Resolver:
1. inherits entity/location defaults
2. removes exact duplicate asset IDs
3. applies authority/role conflict checks
4. enforces H3 budgets
5. orders deterministically by role priority + explicit user order
6. assigns Picture/Video/Audio tags
7. emits a visible mapping preview

Example:
- Picture 1 → identity / LOCKED
- Picture 2 → costume / LOCKED
- Picture 3 → environment / GUIDANCE
- Video 1 → camera_motion / ROLE_ONLY
- Audio 1 → voice / ROLE_ONLY

Tag strings are never stored as the canonical reference relationship.

## Prompt compiler

Two compiler families:
- Base compiler for T2VA/I2VA/FL2VA-style prompts.
- Full-reference compiler for Ref2VA/R2V.

Store:
- human Director Notes
- compiled prompt
- compiler ID/version
- capability-profile version
- reference mapping
- exact authored dialogue hash

Exact authored dialogue must not be paraphrased unless the creator explicitly asks for a dialogue rewrite before compilation.

## Duration resolver

Shot stores `target_seconds`. H3 resolver returns:
- target seconds
- effective frame count
- effective seconds
- frame rate
- grid explanation

UI must show mismatch before render, not after.

## Resolution resolver

Input: aspect ratio + quality profile.
Output: H3-valid width/height on multiple-of-32 grid, with native/preview/master designation.

## Render profiles

### PREVIEW
- smaller/faster resolution
- `ref_image_size=match` by default
- validate motion/camera/performance
- not auto-approved as final

### PRODUCTION
- native base target around 768px short edge
- stronger identity refs may use `max`
- full target duration/audio
- intended take-selection stage

### MASTER
- approved base take
- configured finishing/regeneration/upscale path
- retain original H3 context and lineage

Do not claim a generic upscaler is equivalent to H3 Regenerate-2K. Treat official regeneration as a distinct optional backend path.

## Queue optimization

FL2VA and Ref2VA use different model weights in ComfyUI. Queue scheduler may group jobs by model family to reduce avoidable swaps, but it must preserve explicit priority/dependency constraints.

## Preflight failures

Block render for:
- duration outside capability
- invalid reference counts/type mix
- invalid audio-only Ref2VA input
- reference video/audio durations outside capability
- missing required keyframe
- resolution outside configured grid/range
- missing/incompatible workflow adapter
- disconnected backend
- backend marked not authorized/configured for current deployment context

Warnings (creator may proceed where technically valid):
- redundant refs
- conflicting identity refs
- target duration differs materially from effective duration
- expensive `max` reference settings
- native audio likely to be replaced later

## Local/API boundary and licensing

H3 backend choices must be configured separately:
- ComfyUI/local H3 base where legally/contractually authorized
- MiniMax API where available/configured
- optional Context-IR / H3-Regenerate-2K paths

The Aug 2, 2026 MiniMax H3 Community License defines excluded territories including the United States, European Union, United Kingdom, and Republic of Korea. Do not make the app enforce legal conclusions; do make backend configuration explicit, expose a license/territory acknowledgement, and allow local H3 to be disabled without disabling STUDIO/video generally. Users remain responsible for applicable terms and permissions.

## Test requirements

- golden compiled prompts for each mode
- exact dialogue preservation test
- deterministic reference numbering test
- budget/limit tests
- duration-grid fixtures
- resolution-grid fixtures
- FL2VA/Ref2VA workflow-adapter contract fixtures
- capability-profile version migration tests
- licensing-config behavior test (disabled backend is not selected)

---

# Appendix — docs / render / color-management

_Source file: `docs/render/color-management.md`_

# Color Management Strategy v0.2

AI generation workflows often mix images and video from many models/applications. Without explicit color metadata, the same asset can appear different between the Studio viewer, ComfyUI, transcoding, and the final edit.

OpenColorIO (OCIO) is the preferred long-term color-management layer because it is designed for motion-picture/VFX/animation pipelines and supports ACES workflows.

## v1 requirements

Do not attempt to build a grading application.

Project settings must nevertheless track:
- working/display color policy
- assumed color space for imported assets when metadata is missing
- per-asset source color-space tag/override
- output/export color-space intent
- whether an asset has an unknown/assumed color interpretation

Viewer/export code should be designed so an OCIO display transform can be introduced without rewriting domain objects.

## Recommended implementation path

Phase A:
- preserve source metadata
- display warnings for unknown interpretation
- support sRGB/Rec.709-safe defaults for ordinary creator workflows
- include color tags in derived asset lineage

Phase B:
- OCIO configuration selector
- OCIO-aware viewer transform
- project working space
- ACES-compatible presets
- color-space conversion during proxy/export where explicitly requested

## Rules

- Never destructively bake a display transform into a canonical source asset.
- A derived conversion receives a new Asset ID and lineage.
- Do not silently reinterpret an asset when project color policy changes.
- Export preflight flags unknown/mismatched critical assets.

---

# Appendix — docs / security / baseline

_Source file: `docs/security/baseline.md`_

# Security & Privacy Baseline

- Least-privilege Tauri capabilities.
- Project-root filesystem scoping.
- No arbitrary shell access from ordinary UI/agents.
- API keys in secure secret storage, never project files/logs.
- Structured-log redaction.
- Atomic writes and backups before risky migrations/bulk edits.
- Agent writes are patches by default.
- Explicit confirmation for destructive actions.
- Privacy routing modes: Local Only, Local First, Cloud Allowed.
- No silent cloud fallback.
- Imported workflow/custom-node dependencies are treated as code-bearing/untrusted.
- Sanitize Markdown/HTML rendering.
- User-visible permission changes and security documentation.

---

# Appendix — docs / security / threat-model

_Source file: `docs/security/threat-model.md`_

# Threat Model v0.2

This is a starting threat model and must evolve with implementation.

## Assets to protect
- project Markdown/Fountain/canon/state
- original media and approved Takes
- API credentials/tokens
- private prompts/context sent to models
- renderer/model endpoint credentials
- user-selected external files
- project history/backups

## Trust boundaries
1. Tauri frontend WebView ↔ privileged Rust commands
2. project folder ↔ arbitrary host filesystem
3. app ↔ cloud AI providers
4. app ↔ local AI servers
5. app ↔ ComfyUI/custom nodes/workflows
6. app ↔ FFmpeg/external processes
7. native app ↔ external MCP callers/servers
8. imported Markdown/HTML/media metadata ↔ renderer/UI

## Primary threats and controls

### Path traversal / arbitrary file access
Controls:
- project-relative handles
- canonicalize/normalize server-side
- project-root jail
- Tauri allow/deny scopes
- explicit picker grants for external imports
- tests for `..`, symlinks/junctions, case/Unicode edge cases

### Command injection
Controls:
- typed process arguments
- no shell interpolation
- allowlisted binaries/actions
- no arbitrary agent-generated shell execution from normal product tools
- explicit advanced/developer mode if raw commands are ever introduced

### Secret leakage
Controls:
- OS/Tauri secure secret service
- redact logs/crash/support bundles
- never serialize auth headers or keys into project/generation packets
- environment-variable/token boundaries for external processes

### Unintended cloud egress
Controls:
- destination-aware ModelGateway
- LOCAL_ONLY hard fail
- explicit cloud fallback policy
- Context Inspector shows destination and included sources
- audit route decision without logging raw secret content

### Malicious or unsafe ComfyUI workflow/custom node
Controls:
- treat workflow/node dependencies as untrusted executable integration material
- never auto-install custom nodes
- workflow adapter hashes/contracts
- explicit missing-dependency UI
- do not execute installer commands supplied by model output

### Agent overwrites / stale writes
Controls:
- patch-first writes
- base revision/hash
- stale patch rejection
- user review for canon/state/deletion/security changes
- atomic writes/snapshots

### Corrupt/malicious project file
Controls:
- schema validation
- bounded parser input
- HTML/Markdown sanitization
- preserve invalid file for recovery rather than destructive auto-fix
- project health diagnostics

### Archive/import attacks
Controls:
- bounded extraction sizes/counts
- path-safe extraction
- no symlink escape
- MIME/signature probing rather than extension trust alone when security-sensitive

### Dependency/supply-chain risk
Controls:
- lockfiles
- dependency review/update cadence
- automated security advisories/scans
- minimize native/privileged dependencies
- documented provenance for bundled binaries

### External MCP tools
Controls:
- explicit tool permission classes
- project/domain APIs rather than raw filesystem
- authenticated/authorized remote transport where applicable
- destructive/network/render operations permissioned
- audit tool invocation

## Security verification
Use OWASP ASVS 5.0.0 as a systematic reference where applicable to the desktop/local-webview architecture, supplemented by desktop/process/filesystem-specific threat modeling.

---

# Appendix — AGENTS

_Source file: `AGENTS.md`_

# Coding Agent Contract

This repository is expected to be developed partly by coding agents. The agent must treat planning, verification, schemas, security, migration safety, and documentation as part of implementation rather than cleanup.

## Instruction precedence
1. Direct user/maintainer instruction.
2. More specific nested `AGENTS.md` / `AGENTS.override.md` if later added.
3. This repository root `AGENTS.md`.
4. Product/architecture docs and roadmap.

If two written requirements conflict, do not guess. Record the conflict in `CURRENT_WORK.md` and resolve it before implementing destructive or difficult-to-reverse behavior.

## Required task loop

1. Read `AGENTS.md`, `CURRENT_WORK.md`, `ROADMAP.md`, and the relevant docs before editing.
2. Inspect existing code/tests/behavior. Do not replace working architecture from assumption.
3. Locate the matching roadmap/backlog item. If none exists, create one with acceptance criteria before coding.
4. Mark the active item `IN PROGRESS` in `CURRENT_WORK.md` and roadmap/backlog as appropriate.
5. Classify change impact: user behavior, domain, persisted schema, migration, adapter/provider contract, security/privacy, docs, backward compatibility.
6. Implement the smallest coherent change.
7. Add/update tests, schemas, fixtures, migrations, error states, and docs as the behavior is implemented.
8. If the user changes the requirement, update the specification and acceptance criteria first; mark obsolete criteria rather than continuing stale work.
9. Run every applicable verification command.
10. Update documentation/changelog/ADR in the same change.
11. Check off each acceptance criterion only after it is actually verified.
12. Mark `DONE` only when `docs/development/definition-of-done.md` passes.
13. Update `CURRENT_WORK.md` with the next actionable task and any blockers.

## Hard architectural rules

- Files are authoritative; SQLite is a rebuildable index/cache.
- Worldbuilding stays human-readable Markdown/YAML.
- Screenplay remains portable Fountain where that representation is used.
- No provider, renderer, H3, or ComfyUI-specific syntax in core domain objects.
- UI components do not contain durable domain/business rules.
- External integrations live behind adapters/ports/services.
- All persisted structured data is schema validated.
- Schema changes require explicit versions and migrations.
- Stable IDs do not depend on filenames or display names.
- Agent writes use reviewable patches unless the user has explicitly granted the exact low-risk auto-apply scope.
- Never silently change canon, screenplay, state/reveal facts, production approval, or security settings.
- Never silently send project content to a cloud provider.
- Never store API keys/tokens in project files, generated packets, fixtures, logs, or crash bundles.
- Never weaken security, disable validation, or delete tests merely to make a task pass.
- Never auto-install untrusted ComfyUI custom nodes/workflows.
- Never guess ComfyUI node mappings after workflow drift; fail incompatible and require remap/re-registration.
- Approved/canon media is versioned, not overwritten.
- Generated outputs keep lineage metadata.
- Shell/FFmpeg/process execution uses typed argument builders/allowlists, never user/agent-produced raw shell strings.

## Data safety rules

- Use atomic writes for durable authored files.
- Back up before destructive migrations.
- Preserve unknown user data where schema policy permits it; never drop fields silently.
- File moves/renames update links in a transaction or provide recovery if partially failed.
- Imported/generated original media is immutable; derived media receives new identity/lineage.
- Index/cache corruption must be recoverable by rebuild.

## Security/privacy rules

- Follow least privilege for Tauri capabilities and filesystem access.
- Treat project documents/prompts/images as potentially sensitive user data.
- `LOCAL_ONLY` routing must fail rather than cloud-fallback.
- Cloud fallback behavior must be explicit and visible.
- Scrub secrets and unnecessary content from logs/diagnostics.
- Validate external URLs, filenames, relative paths, archive extraction, and connector output.
- Keep dependencies pinned/locked and review security advisories.
- Use OWASP ASVS as a verification reference, not as a substitute for threat modeling.

## Required verification

Use all checks applicable to touched code. The repository should converge on one local `verify` command that CI also uses.

- formatting
- lint
- TypeScript typecheck
- unit tests
- integration/contract tests
- Rust fmt/clippy/tests
- schema validation
- migration fixture tests
- E2E smoke tests
- frontend/application build
- dependency/security checks
- golden H3 prompt tests when compiler changes
- ComfyUI adapter contract fixtures when mappings change

If a required check cannot run, the task is `BLOCKED` or requires an explicit documented waiver. Do not report normal completion.

## Documentation synchronization

A behavior change is incomplete until documentation is synchronized.

- User workflow change → product/workspace docs.
- Architecture boundary change → ADR + architecture docs.
- Persisted format/schema change → schema docs + migration + fixtures.
- H3 compiler semantic change → H3 docs + golden tests.
- ComfyUI adapter contract change → adapter docs + contract tests.
- Provider/model routing change → Model Gateway + privacy docs.
- Security permission change → security docs + ADR + verification.
- Public configuration/shortcut change → corresponding reference docs.

Do not leave documentation knowingly describing superseded behavior.

## Status/checklist rules

Allowed status values: `NOT STARTED`, `IN PROGRESS`, `BLOCKED`, `DONE`, `DONE WITH WAIVER`.

- Only one primary task should normally be `IN PROGRESS` per agent worktree/session.
- Checkboxes mean verified completion, not intention.
- If a requirement is removed, mark it `SUPERSEDED` with a reason/date rather than deleting all trace during active development.
- `DONE WITH WAIVER` requires the missing verification, reason, risk, and follow-up owner/task.

## Completion report

For each completed task report:
- what changed
- files changed
- tests/checks actually run and results
- documentation updated
- schema/migration/compatibility implications
- privacy/security implications
- known limitations/follow-ups
- next roadmap item

---

# Appendix — CODING_AGENT_BOOTSTRAP_PROMPT

_Source file: `CODING_AGENT_BOOTSTRAP_PROMPT.md`_

# Coding Agent Bootstrap Prompt — v0.2

Use this as the first instruction when handing this planning package to a coding agent.

---

You are implementing a local-first AI-native animation and worldbuilding production application from this repository's planning package.

## Read before doing anything

Read, in this order:
1. `AGENTS.md`
2. `CURRENT_WORK.md`
3. `ROADMAP.md`
4. `PRODUCT_SPEC_V0.2.md`
5. `MASTER_BUILD_SPEC.md`
6. `IMPLEMENTATION_BACKLOG_V0.2.md`
7. `docs/architecture/service-boundaries.md`
8. `docs/security/baseline.md`
9. `docs/development/definition-of-done.md`
10. the documents specific to the task you are about to implement.

Do not infer requirements solely from this bootstrap prompt. The repository documents and schemas are the implementation contract.

## First task

Begin with **P0.1 Repository scaffold only** unless the maintainer explicitly selects another task.

Before editing:
- copy P0.1 into `CURRENT_WORK.md` as the active task;
- mark it `IN PROGRESS`;
- restate its acceptance criteria in that file;
- identify impacted docs, tests, security boundaries, and architecture surfaces.

Do not start WORLD, STORY, STUDIO, CUT, LLM-provider, or ComfyUI features before their prerequisite phases are satisfied.

## Mandatory operating loop

For every task:
1. inspect existing implementation and docs;
2. select/define the backlog item and acceptance criteria;
3. mark work `IN PROGRESS`;
4. implement the smallest coherent slice;
5. add or update tests while implementing;
6. update schemas/migrations/fixtures when persisted contracts change;
7. update documentation in the same change when behavior changes;
8. add/update an ADR when an architectural boundary changes;
9. run the repository verification command and all task-specific checks;
10. check off only criteria actually verified;
11. update `CURRENT_WORK.md` and changelog;
12. report exact verification evidence and known follow-ups.

If the maintainer changes a requirement while work is underway, update the relevant specification and acceptance criteria **before** continuing. Mark old criteria `SUPERSEDED` where useful; do not keep implementing stale requirements from memory.

## Non-negotiable architecture rules

- Authored files are authoritative; SQLite/vector indexes are rebuildable projections.
- Markdown/YAML/Fountain/JSON/ordinary media files remain portable and human-inspectable.
- Stable IDs are used for cross-object identity; filenames are presentation, not identity.
- Domain objects remain renderer-neutral.
- MiniMax H3 is a first-class renderer/compiler, not the project data model.
- ComfyUI is an external render backend behind versioned semantic workflow adapters.
- LLM agents propose patches to durable authored state; they do not silently rewrite canon.
- Model providers are behind a Model Gateway; agent definitions are separate from model/provider selection.
- `LOCAL_ONLY` is fail-closed: never silently fall back to cloud.
- MCP is an optional interoperability/tool boundary; direct LLM provider APIs are the model-inference boundary.
- Exact editorial time is frame/rational based, not float-only seconds.
- Original media is immutable; derivatives have new lineage.
- GPU/model contention is coordinated through `ResourceCoordinator`, not ad-hoc cross-service calls.

## Security and data safety

- Use least-privilege Tauri capabilities and explicit filesystem scopes.
- Keep project access inside the selected project root through canonicalized, validated paths.
- Never construct shell commands from user/agent strings. Use typed process wrappers/argument arrays and an allowlist.
- API keys/secrets must use the SecretsService/OS-backed storage; never project files, prompts, logs, or source control.
- Atomic-write durable authored files.
- Back up and test destructive migrations.
- Preserve unknown user data where policy allows; never drop it silently.
- Refuse stale AI patches when the source hash/version has changed.
- External research and LLM output are untrusted inputs and never become canon automatically.

## Verification discipline

A task is not `DONE` merely because code compiles. Use `docs/development/definition-of-done.md`.

The repository must converge on one local `verify` entry point that CI invokes too. Depending on touched code, verification includes formatting, linting, TypeScript typecheck, unit/integration/contract tests, Rust fmt/clippy/tests, schema/fixture validation, migration tests, E2E smoke tests, build, dependency/security checks, H3 golden prompt tests, and ComfyUI adapter fixtures.

If a required check cannot be run, report the task as `BLOCKED` or `DONE WITH WAIVER` only under the documented waiver rules. Never imply a test passed when it did not run.

## Documentation discipline

Documentation drift is a defect.

Examples:
- workflow/UI behavior change → product/UX docs;
- persisted format change → schema + migration + fixtures + data docs;
- H3 compiler behavior change → H3 docs + golden prompt tests;
- ComfyUI adapter change → adapter contract docs + fixtures;
- provider/privacy routing change → Model Gateway + privacy/security docs;
- permission/process boundary change → security docs + ADR + verification;
- architecture boundary change → architecture docs + ADR.

## Completion response format

At the end of each task report:
- Task ID/status
- What changed
- Files changed
- Acceptance criteria checked
- Tests/checks actually run + results
- Documentation updated
- Schema/migration/backward-compatibility impact
- Security/privacy impact
- Known limitations/follow-ups
- Recommended next backlog item

Do not broaden scope merely because adjacent work looks useful. Record adjacent work in the backlog and continue the selected slice.

---

# Appendix — IMPLEMENTATION_BACKLOG_V0.2

_Source file: `IMPLEMENTATION_BACKLOG_V0.2.md`_

# Implementation Backlog v0.2

This backlog expands ROADMAP into implementable slices. Coding agent must copy the active slice into `CURRENT_WORK.md`, mark it IN PROGRESS, and satisfy its acceptance criteria before marking DONE.

## Phase 0 — Repository & guardrails

### P0.1 Repository scaffold
- Tauri 2 + React + TypeScript
- application package structure by domain/service/adapter/UI
- no business logic in root components
Acceptance:
- app launches desktop shell
- test fixture can instantiate application services without UI
- README documents setup

### P0.2 Verification command
- formatter
- ESLint
- TypeScript typecheck
- unit tests
- Rust fmt/clippy/test
Acceptance:
- one documented command runs local verification
- CI invokes same underlying scripts

### P0.3 Schema harness
- JSON Schema 2020-12 registry
- fixture validation CLI/test utility
- invalid fixture examples
Acceptance:
- every schema parses
- all valid fixtures pass, invalid fixtures fail for intended reason

### P0.4 Security foundation
- Tauri capabilities allowlist
- SecretsService interface
- path normalization/project-root jail
- safe external-process wrapper
Acceptance:
- UI cannot read arbitrary files through application APIs
- secrets absent from logs/project serialization

### P0.5 Docs/change governance
- ADR template
- PR/change template
- docs impact checklist
- changelog conventions
Acceptance:
- coding agent runbook can be followed without conversational context

### P0.6 Timebase/color domain policy
- rational/frame-aware time primitives
- project frame-rate setting
- asset color metadata fields/unknown state
Acceptance:
- domain tests prevent silent float-only timing
- media asset can preserve native fps and color interpretation independently of project defaults

### P0.7 Resource coordinator interfaces
- ResourceCoordinator port/policy types
- no actual GPU automation required yet
Acceptance:
- ComfyUI and ModelGateway depend on coordinator contracts rather than calling each other directly

### P0.8 CI parity
- CI invokes the same verification entry point used locally
- cache optimizations must not change verification semantics
Acceptance:
- clean checkout passes the documented CI/local verification path
- CI failure output identifies which verification stage failed

## Phase 1 — WORLD vault

### P1.1 Project create/open/recent
### P1.2 VaultService atomic file IO + watcher
### P1.3 Markdown editor + reading mode
### P1.4 YAML frontmatter property editor/validation
### P1.5 Wikilink parser/resolver + rename-safe updates
### P1.6 Backlinks/unlinked mentions
### P1.7 SQLite index + FTS + full rebuild
### P1.8 Quick Open + Universal Search v1
### P1.9 Entity templates
### P1.10 Saved property views (table/list/cards)
### P1.11 Knowledge graph
### P1.12 JSON Canvas-compatible creative canvas
### P1.13 Recovery/snapshots
### P1.14 Project Health v1

Phase acceptance demo:
- create characters/locations in Markdown, link/rename them, search, graph, canvas, delete/rebuild index with no authored-data loss.

## Phase 2 — Structured world

### P2.1 Typed WorldEntity metadata
### P2.2 Typed relationships
### P2.3 World timeline/events
### P2.4 Canon authority workflow
### P2.5 Truth/character/audience knowledge
### P2.6 Research inbox
### P2.7 Asset/reference associations to world entities
### P2.8 Canon change impact query

## Phase 3 — Agent platform

### P3.1 Model Gateway interfaces/capability registry
### P3.2 OpenAI adapter
### P3.3 Anthropic adapter
### P3.4 OpenRouter adapter
### P3.5 Ollama adapter
### P3.6 LM Studio adapter
### P3.7 Generic OpenAI-compatible adapter
### P3.8 Privacy/routing policies
### P3.9 Context Manifest/Inspector
### P3.10 Tool registry and permission classes
### P3.11 AgentPatch stale-safe apply
### P3.12 Writing Partner
### P3.13 World Architect
### P3.14 Canon Keeper
### P3.15 Character Director
### P3.16 Continuity Supervisor

Phase acceptance demo:
- same Canon Keeper task can run local or cloud; LOCAL_ONLY cannot leak; a stale patch is refused after manual edit.

## Phase 4 — STORY

### P4.1 Fountain parser/editor/preview
### P4.2 Sequence objects + navigator
### P4.3 Stable scene reconciliation
### P4.4 Scene Capsule editor
### P4.5 StateSnapshot/delta engine
### P4.6 Knowledge/reveal timeline
### P4.7 Beat objects
### P4.8 Moment objects/lane
### P4.9 Scene Lab
### P4.10 Branch/compare/promote
### P4.11 Dialogue/read-through tools
### P4.12 Story diagnostics

## Phase 5 — STUDIO image/board foundation

### P5.1 Asset ingestion/probe/checksum/lineage
### P5.2 Asset Library/filtering
### P5.3 ReferenceSet UI/resolver core
### P5.4 Visual Development Canvas
### P5.5 ComfyUI connection + health
### P5.6 Workflow registry/hash validation
### P5.7 Semantic input mapping
### P5.8 Image render queue/output ingest
### P5.9 Storyboard panel model
### P5.10 Board thumbnails/timing
### P5.11 Board captions/annotation overlay
### P5.12 Board audio/playback/scrubbing
### P5.13 Board-to-Shot conversion
### P5.14 Shot Designer

## Phase 6 — H3 / video

### P6.1 H3 capability profile + licensing config flag
### P6.2 Mode router
### P6.3 duration/frame-grid resolver
### P6.4 resolution resolver
### P6.5 semantic reference budget/order resolver
### P6.6 base prompt compiler + golden tests
### P6.7 Ref2VA prompt compiler + golden tests
### P6.8 H3 preflight
### P6.9 FL2VA ComfyUI adapter fixture
### P6.10 Ref2VA ComfyUI adapter fixture
### P6.11 H3 queue batching hints
### P6.12 Director Notes / compiled prompt inspector
### P6.13 take ingestion/comparison
### P6.14 timecoded review notes
### P6.15 continuation workflow
### P6.16 API/Context-IR/2K extension point (only when official API contract configured)

Phase acceptance demo:
- board→Ref2VA shot→reference numbering→render→take→continue, with no manual ComfyUI node editing.

## Phase 7 — CUT

### P7.1 OTIO sequence persistence
### P7.2 viewer/playback/proxy engine
### P7.3 timeline clips/tracks/gaps
### P7.4 trim/split/move/snap
### P7.5 ripple behavior
### P7.6 audio tracks/waveforms/scrub
### P7.7 markers/review notes
### P7.8 transitions subset
### P7.9 board-to-take replacement
### P7.10 shot take/version switching
### P7.11 autosave/recovery
### P7.12 review MP4 export
### P7.13 OTIO export + manifest
### P7.14 export preflight
### P7.15 Color-aware viewer/export groundwork
### P7.16 Media relink/offline workflow

## Phase 8 — intelligence/polish

### P8.1 visual continuity advisory checks
### P8.2 production readiness dashboard
### P8.3 missing-shot detection
### P8.4 motion/camera reference library
### P8.5 render family batching/resource hints
### P8.6 optional local semantic embeddings/search
### P8.7 diagnostics/support bundle with secret scrubbing
### P8.8 project templates and onboarding
### P8.9 Optional OCIO integration / ACES-friendly presets

---

# Appendix — docs / development / definition-of-done

_Source file: `docs/development/definition-of-done.md`_

# Definition of Done

A task may be `DONE` only when all applicable boxes are satisfied.

## Functional
- [ ] Acceptance criteria satisfied.
- [ ] Error/empty/loading/offline states handled.
- [ ] Undo/recovery behavior defined for destructive edits.
- [ ] Keyboard flow tested for core path.

## Code quality
- [ ] Formatter clean.
- [ ] Lint clean.
- [ ] Typecheck clean.
- [ ] No debug secrets/log dumps.
- [ ] Business logic outside UI components.
- [ ] External integration behind adapter/service.

## Tests
- [ ] Unit tests updated.
- [ ] Integration/contract tests updated.
- [ ] E2E smoke path updated where user workflow changed.
- [ ] Golden fixtures updated only after deliberate review.
- [ ] Schema/migration fixtures pass where applicable.

## Security/privacy
- [ ] Input/path validation reviewed.
- [ ] Secret handling reviewed.
- [ ] Local/cloud routing behavior reviewed.
- [ ] New external process/network capability justified.
- [ ] Dependency/security scan reviewed.

## Data compatibility
- [ ] Schema impact classified.
- [ ] Migration implemented if needed.
- [ ] Backup/recovery considered.
- [ ] Rebuildable-index guarantee preserved.

## Documentation & tracking
- [ ] Relevant docs updated in same change.
- [ ] ADR updated if required.
- [ ] Changelog updated if notable.
- [ ] ROADMAP/CURRENT_WORK checked off.
- [ ] Known limitations recorded.

## Verification report
Completion response must list commands/checks actually run and their results. Never claim a check ran when it did not.

---

# Appendix — docs / development / testing

_Source file: `docs/development/testing.md`_

# Testing

## Unit
- domain transitions
- H3 routing/duration/reference numbering
- prompt compiler
- patch conflicts
- permission decisions

## Schema/fixtures
- valid examples pass
- malformed examples fail clearly
- migrations upgrade historical fixtures

## Integration
- project/index lifecycle
- agent patch/apply
- ComfyUI job lifecycle
- output ingestion/lineage

## E2E
- project → world → scene → shot → packet → take → cut → export

Golden tests are required for H3 prompt outputs, transformed ComfyUI API workflow JSON, OTIO, and frontmatter serialization.

---

# Appendix — docs / development / change-control

_Source file: `docs/development/change-control.md`_

# Change Control & Documentation Synchronization

## Principle
A behavior change is not complete until implementation, tests, schemas/migrations, user/developer documentation, and project tracking agree.

## Required pre-change classification
Before code changes, classify:
- user-visible behavior
- domain behavior
- persisted schema
- migration
- adapter/provider contract
- security/privacy permissions
- performance/resource behavior
- documentation
- backward compatibility

Record classification in the active roadmap task.

## Requirement-change protocol
If the user or maintainer changes how a feature should work while implementation is in progress:
1. Stop implementing the superseded behavior.
2. Update the relevant product spec/ADR/acceptance criteria.
3. Mark obsolete checklist items clearly; do not silently delete history.
4. Assess schema/migration/compatibility consequences.
5. Update or replace tests to reflect the new requirement.
6. Continue implementation.
7. Update changelog if behavior was previously released.

## Documentation matrix
- User workflow changed → workspace/product docs.
- CLI/config changed → configuration docs/examples.
- Domain object changed → production-object-model + schema docs.
- Persisted schema changed → schema version + migration + fixtures.
- H3 compiler changed → H3 docs + golden prompt tests.
- Workflow adapter changed → ComfyUI docs + contract fixture.
- Provider routing changed → Model Gateway + privacy docs.
- Security capability changed → security baseline + ADR + tests.
- Architecture dependency changed → architecture docs + ADR.

## ADR threshold
Create/update an ADR for decisions that:
- change source-of-truth ownership
- introduce a new persistent store
- alter trust/security boundaries
- replace major framework/library
- alter renderer/provider abstraction
- change project format/interchange
- create a difficult-to-reverse dependency

## Changelog
Use Keep-a-Changelog style categories: Added, Changed, Deprecated, Removed, Fixed, Security. Unreleased changes accumulate at top.

---

# Appendix — docs / research / research-basis-v0.2

_Source file: `docs/research/research-basis-v0.2.md`_

# Research Basis v0.2

Last reviewed: 2026-08-09

This file records the external product/technical precedents used to shape v0.2. It is not a dependency list; it explains which ideas were adopted and which boundaries were deliberately kept. Re-check vendor documentation before implementing version-sensitive APIs.

## Obsidian — Markdown knowledge work
Sources:
- https://obsidian.md/help/bases
- https://obsidian.md/help/bases/views
- https://obsidian.md/help/backlinks
- https://obsidian.md/help/plugins/graph
- https://obsidian.md/help/Plugins/Canvas
- https://obsidian.md/help/Plugins/Core%2Bplugins

Observed useful patterns:
- Database-like views remain projections over local Markdown/properties.
- Backlinks and unlinked mentions are useful context/navigation surfaces.
- Graph view is useful for relationship exploration.
- Canvas is an infinite space containing notes/media and uses the open JSON Canvas format.
- Command palette, quick switcher, recovery, outline, templates, bookmarks, and workspaces are baseline knowledge-tool expectations.

Adopt:
- Markdown source of truth, typed frontmatter, backlinks, graph, canvas, saved property views, fast keyboard navigation, recovery.
Do not copy:
- Obsidian's plugin architecture or UI wholesale.

## Fountain — portable screenplay text
Sources:
- https://fountain.io/
- https://fountain.io/syntax/

Observed useful patterns:
- Human-readable plain-text screenplay syntax.
- Scene headings/numbers, dialogue, parentheticals, dual dialogue, transitions, notes, boneyard, sections, and synopses.
- Fountain intentionally focuses on creative screenplay authoring rather than every locked-page production feature.

Adopt:
- `.fountain` as a portable screenplay option and parser/render support.
- Separate Scene Capsule keeps state/production metadata out of screenplay formatting.

## Toon Boom Storyboard Pro — expected storyboard/animatic tools
Sources:
- https://docs.toonboom.com/help/storyboard-pro-25/storyboard/timing/about-timing.html
- https://docs.toonboom.com/help/storyboard-pro-24/storyboard/reference/views/panel-view.html
- https://docs.toonboom.com/help/storyboard-pro-24/storyboard/getting-started/animatic.html
- https://docs.toonboom.com/help/storyboard-pro-24/storyboard/reference/menus/main/play-menu.html

Observed useful patterns:
- Panels need editable captions such as dialogue, action, timing/slugging, and notes—not only an image.
- Animatics need per-panel timing, timeline editing, camera moves, sound/video, and transitions.
- Playback ranges, looping, synchronized sound, audio scrubbing, thumbnails, and frame-aware timing are ordinary creator expectations.

Adopt:
- These baseline production tools, simplified for AI-native animation.
Do not build initially:
- Full professional drawing/3D feature parity.

## MiniMax H3 + ComfyUI
Sources:
- https://github.com/MiniMax-AI/MiniMax-H3
- https://docs.comfy.org/tutorials/video/minimax/minimax-h3
- https://huggingface.co/MiniMaxAI/MiniMax-H3/blob/main/docs/VIDEO_PROMPT_WRITING_GUIDE_base_en.md
- https://huggingface.co/MiniMaxAI/MiniMax-H3/blob/main/docs/VIDEO_PROMPT_WRITING_GUIDE_ref_en.md
- https://huggingface.co/MiniMaxAI/MiniMax-H3/blob/main/LICENSE

Observed current constraints/capabilities:
- H3 is multimodal and generates synchronized stereo audio/video.
- H3 Base output is 24 fps and 4–15 seconds; default short edge is 768 pixels; the broader H3 system includes context processing and 2K regeneration.
- FL2VA covers text and first/last-frame workflows; Ref2VA uses distinct weights and multimodal references.
- Ref2VA supports up to 9 images, 3 videos, 3 standalone audio clips, maximum 12 mixed files, with reference-duration/input conditions.
- Full-reference prompting explicitly distinguishes Subjects, Pictures, Videos, and Audio and can use reference videos for camera/rhythm/continuation relationships.
- The prompt guides make camera movement, shot timing, speaker identity, exact dialogue, soundscape, and music first-class prompt structure.

Adopt:
- H3 mode router, semantic reference resolver, preflight, prompt compiler, duration/resolution resolver, local/API adapter boundary, continuation, and model-family-aware batching.
- Store semantic references and intent, never positional renderer tag strings as source of truth.

Licensing note:
- The open-weight H3 community license published Aug 2, 2026 defines excluded territories including the US, EU, UK and Republic of Korea. The application must not assume local open-weight deployment is licensed everywhere. Treat this as a configuration/compliance concern and direct users to MiniMax for current authorization/terms. This project is not legal advice.

## ComfyUI server/API
Sources:
- https://docs.comfy.org/development/comfyui-server/comms_overview
- https://docs.comfy.org/development/comfyui-server/comms_routes
- https://docs.comfy.org/development/comfyui-server/comms_messages
- https://docs.comfy.org/interface/app-mode

Observed useful architecture:
- The client submits the whole workflow to `/prompt`.
- `/ws` emits execution/progress/status events.
- History, queue, interruption, system statistics, features, and object/node information have documented server routes.
- App Mode demonstrates the value of exposing chosen workflow inputs/outputs instead of forcing users to manipulate every node.

Adopt:
- ComfyUI as external render backend with versioned semantic workflow adapters, API submission, WebSocket progress, and explicit incompatibility on workflow drift.

## OpenTimelineIO
Sources:
- https://opentimelineio.readthedocs.io/en/latest/
- https://opentimelineio.readthedocs.io/en/latest/tutorials/time-ranges.html
- https://opentimelineio.readthedocs.io/en/latest/tutorials/adapters.html

Observed useful model:
- OTIO represents editorial cut information including clips, timing, tracks, gaps, transitions, markers, metadata and externally referenced media.
- Frame/time ranges are explicit rather than being represented only as floating-point seconds.
- Adapter/plugin mechanisms support interchange with other editorial formats, though individual adapters may be lossy.

Adopt:
- OTIO-compatible concepts as CUT persistence/interchange boundary, with richer production metadata linked by stable IDs.
Do not assume:
- OTIO defines final rendering/effect semantics for every NLE feature or that every third-party adapter is lossless.

## OpenColorIO / ACES-ready color architecture
Sources:
- https://opencolorio.readthedocs.io/
- https://opencolorio.readthedocs.io/en/main/configurations/aces_studio.html

Observed useful model:
- OCIO is designed for consistent motion-picture/VFX/animation color management and supports ACES-oriented configurations.

Adopt:
- Preserve color metadata and design viewer/export boundaries for later OCIO integration.
- Do not build a full grading application in v1.

## Local/cloud LLM backends
Sources:
- https://platform.openai.com/docs/quickstart/make-your-first-api-request
- https://docs.anthropic.com/en/docs/mcp
- https://docs.ollama.com/api/openai-compatibility
- https://lmstudio.ai/docs/developer/openai-compat
- https://lmstudio.ai/docs/developer/anthropic-compat
- https://lmstudio.ai/docs/developer/rest
- https://lmstudio.ai/docs/integrations/lmlink
- https://lmstudio.ai/docs/bionic
- https://openrouter.ai/docs/faq

Observed useful capabilities:
- OpenAI Responses supports multimodal inputs and tools.
- Ollama exposes OpenAI-compatible Chat Completions and Responses for local models.
- LM Studio exposes OpenAI-compatible endpoints, Anthropic-compatible Messages, and a native REST API with model management; LM Link can route local API calls to a remote linked device.
- Bionic is a separate agent application, not merely an inference endpoint.
- OpenRouter provides unified API access, provider/model fallbacks, and privacy-related routing controls.

Adopt:
- Model Gateway with provider adapters, capability profiles, and explicit privacy/fallback routing.
- No silent local-to-cloud fallback.
- Bionic interoperability through open project files/MCP later, not as a core inference provider.

## MCP
Sources:
- https://blog.modelcontextprotocol.io/posts/2026-07-28/
- https://modelcontextprotocol.io/

Observed current direction:
- The 2026-07-28 specification uses a stateless core.
- Roots, Sampling, and Logging are deprecated for new designs; direct LLM-provider integration is the replacement direction for Sampling.
- Tool schemas use JSON Schema 2020-12.

Adopt:
- Direct model calls through ModelGateway.
- MCP as an optional external tool/interoperability boundary for the project, not our model router.

## Coding-agent and security practices
Sources:
- https://openai.com/index/introducing-codex/
- https://openai.com/index/running-codex-safely/
- https://owasp.org/www-project-application-security-verification-standard/

Observed useful practices:
- Repository `AGENTS.md` can give coding agents navigation/testing/convention instructions.
- Configured environments, reliable test commands, clear documentation, explicit permissions, and completion evidence improve agent effectiveness and governance.
- Coding agents should operate within explicit technical boundaries with higher-risk actions requiring stronger approval.
- OWASP ASVS supplies a systematic application-security verification baseline; current stable ASVS is 5.0.0 at review time.

Adopt:
- AGENTS contract, live roadmap/current-work file, Definition of Done, same verify command locally/CI, change-impact classification, docs-in-same-change rule, least privilege, auditability, and explicit high-risk approval boundaries.

---

# Appendix — schemas / README

_Source file: `schemas/README.md`_

# Schemas

JSON Schema 2020-12 contracts for the production object model.

These are planning-grade v0.2 contracts. The coding agent must build a schema registry and valid/invalid fixture harness before application code depends on them. Any later incompatible persisted-format change requires a new schema version and migration rather than silently changing already-written user data.

Authoritative design semantics are in `PRODUCT_SPEC_V0.2.md`, `MASTER_BUILD_SPEC.md`, and `docs/data/production-object-model.md`.

## Core production schemas
- `world-entity.schema.json`
- `state-snapshot.schema.json`
- `sequence.schema.json`
- `scene.schema.json`
- `beat.schema.json`
- `moment.schema.json`
- `shot.schema.json`
- `reference-set.schema.json`
- `generation-packet.schema.json`
- `render-job.schema.json`
- `take.schema.json`
- `assembly-clip.schema.json`

## Supporting schemas
- `asset.schema.json`
- `timeline-event.schema.json`
- `knowledge-state.schema.json`
- `review-note.schema.json`
- `agent-patch.schema.json`
- `workflow-adapter.schema.json`
- `provider-profile.schema.json`
- `model-profile.schema.json`
- `production-task.schema.json`
- `export-preset.schema.json`
- `frame-rate.schema.json`
- `frame-range.schema.json`

## Timing rule
Editorial/persisted frame positions use exact frame counts plus rational frame rates. Floating-point seconds may be derived for display/estimation but are not the sole authoritative representation for CUT ranges.

- `board-panel.schema.json` — storyboard/animatic panel with exact timing, captions, camera plan, annotations, and promotion links.


## Fixtures

Contract fixtures live in `../fixtures/schemas/`:

- `valid/` contains examples that must validate.
- `invalid/` contains examples that must fail validation for the intended reason.

Any schema behavior change must update affected fixtures in the same change. The project verification command must validate both sets so a permissive schema cannot pass merely because positive examples succeed.

---
