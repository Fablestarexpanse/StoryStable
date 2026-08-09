# Agent Permissions

Tool risk levels (spec section 8.4): `read_only`, `writes_project`,
`destructive`, `external_network`, `cost_incurring`, `executes_code`.

Default policy: read-only runs automatically; project writes propose a patch
or require scoped auto-apply permission; destructive requires explicit
confirmation; network/cloud obeys privacy policy with visible destination;
code execution is never exposed to ordinary story agents.

Auto-apply scope is limited to explicitly low-risk areas (tags, inferred
aliases, non-canon scratch notes, generated summaries). Canon, screenplay,
scene state, production status, deletion, provider permissions, and security
settings default to review.
