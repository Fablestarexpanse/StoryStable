# Glossary

| Term             | Meaning                                                                                                                                                  |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| WorldEntity      | A Markdown note with validated frontmatter describing canon (character, location, faction, ...).                                                         |
| StateSnapshot    | What is physically true and what specific observers know at a story point. World truth, character knowledge, and audience knowledge are never collapsed. |
| Scene            | Narrative unit with intent, start/end state, reveals, and moments.                                                                                       |
| Scene Capsule    | The structured production/state companion to a screenplay scene.                                                                                         |
| Beat             | Dramatic/narrative action inside a scene.                                                                                                                |
| Moment           | Something the audience should experience that may become one or more shots.                                                                              |
| BoardPanel       | Storyboard/animatic interpretation of a Moment; frame-exact timing; cheap to branch and reject.                                                          |
| Shot             | Renderer-neutral production intent object. Never stores the H3 prompt as canon.                                                                          |
| ReferenceSet     | Ordered reference entries, each with semantic role + authority + use scope (see ADR-0001).                                                               |
| GenerationPacket | Immutable render request after submission; records effective values as submitted.                                                                        |
| RenderJob        | Backend job state machine: created, queued, running, then succeeded/failed/cancelled/interrupted.                                                        |
| Take             | A rendered result with lineage, review decision, and QC flags.                                                                                           |
| AssemblyClip     | A timeline clip binding shot + selected take into the edit.                                                                                              |
| AgentPatch       | A reviewable, hash-guarded proposed change to durable project files.                                                                                     |
| Lineage          | The traceable chain from any output back to scene/shot/refs/model/workflow/settings.                                                                     |
