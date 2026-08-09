# Workflow Adapters

Adapters map semantic inputs (prompt, width, height, duration, picture_1, ...)
to exact ComfyUI node/field contracts, are versioned independently of app
releases, and store the workflow JSON hash in every GenerationPacket.

If a workflow changes and mappings break, the adapter is marked
`incompatible` - never guess nodes. Imported adapters are `untrusted` until
inspected. (Spec sections 7.1-7.2.)
