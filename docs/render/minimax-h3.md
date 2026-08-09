# MiniMax H3

H3 is the first-class video renderer but never the domain model (spec section 6).

Key contracts:

- **Mode router:** Ref2VA if non-keyframe multimodal refs; else FL2VA if
  first+last frame; else I2VA if first frame; else L2VA if supported; else T2VA.
- **Duration:** adapter-owned `getAllowedFrameCount()` honoring the 24fps
  frame/block grid; requested vs effective duration always shown before queue.
- **Resolution:** computed from aspect ratio + profile, honoring the model
  resolution multiple; previews never silently upscaled.
- **Reference resolver:** creator assigns semantic roles; resolver owns
  `<Picture N>`/`<Video N>`/`<Audio N>` numbering and regenerates tags
  atomically on any change.
- **Preflight:** reference counts (max 9 images, 3 videos, 3 audios, 12
  mixed), duration/resolution constraints, workflow compatibility, disk/VRAM.
- **License gate:** local open-weight H3 requires license/territory
  acknowledgement and can be disabled while generic renderers remain.

Implementation arrives in Phase 6 with golden tests for compiled prompts.
