# ComfyUI Backend

ComfyUI is an external/sidecar render engine behind the `RenderBackend`
interface (spec section 7.3): probe, validate, submit, subscribe, cancel,
getResult, freeResources. ComfyUI-specific code stays behind this boundary.

Safety: imported workflows/custom nodes are code-bearing dependencies;
adapters are untrusted until approved; nodes are never auto-installed.

Implementation arrives in Phase 5.
