# Threat Model

Assets: user canon/story files, media, API keys, local model/render
infrastructure.

Primary threats and mitigations (spec section 12):

| Threat                                       | Mitigation                                                                            |
| -------------------------------------------- | ------------------------------------------------------------------------------------- |
| Prompt injection in project/research content | Injected text never grants tools or overrides policy; agents read-only by default     |
| Malicious ComfyUI workflow/custom node       | Untrusted-until-approved adapters; no auto-install; required nodes surfaced           |
| Secret leakage                               | OS-backed secret storage; redaction in logs/errors; secrets excluded from diagnostics |
| Path escape / symlink abuse                  | Path validation against project root; careful symlink/network-path handling           |
| Data loss from writes/migrations             | Atomic writes; pre-migration backups; rebuildable index                               |
| Silent cloud exfiltration                    | Privacy modes; visible routing in job metadata; no silent fallback                    |
| Script execution via Markdown/canvas         | Never auto-execute embedded scripts; sanitize rendered HTML                           |

To be expanded with a full ASVS-mapped checklist as features land.
