# Model Gateway

Agent identity is not model identity:

```text
Agent -> Capability Request -> Routing Policy -> Provider/Model
```

Provider families: OpenAI, Anthropic, OpenRouter, Ollama, LM Studio, generic
OpenAI-compatible. Routing presets: LOCAL ONLY, LOCAL FIRST, BALANCED,
BEST QUALITY, CUSTOM. Cloud fallback never occurs silently when privacy mode
disallows it. The capability registry tracks text/vision/tool
calling/structured output/context limit/streaming/privacy class/cost per
model. (Spec section 8.1; PRODUCT_SPEC_V0.2 sections 10.2-10.3.)

Implementation arrives in Phase 3.
