import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  buildAgentContext,
  renderContext,
  spoilerInstruction,
  stripCodeFence,
  AGENTS,
  agentById,
  buildKnowledgeModel,
  type LinkIndex,
  type ParsedNote,
} from '@storystable/vault';
import { PatchReview } from './PatchReview.js';
import type {
  CredentialStatus,
  ModelCapabilities,
  RouteDecision,
  RoutingPolicy,
} from '../services/vault.js';
import {
  providerStatus,
  setProviderKey,
  clearProviderKey,
  modelRegistry,
  openrouterModels,
  localModels,
  previewRoute,
  agentComplete,
  noteHash,
  applyPatch,
} from '../services/vault.js';

interface Props {
  notes: ParsedNote[];
  linkIndex: LinkIndex | null;
  focusPath: string | null;
  /** Vault root, needed to hash and write the target note. */
  root: string;
  /** Called after a proposal is applied, so the workspace reloads. */
  onApplied: () => Promise<void>;
}

/** A proposal awaiting review. */
interface Proposal {
  path: string;
  /** Note contents when the proposal was generated. */
  before: string;
  after: string;
  /** Hash captured before sending; the apply is refused if it no longer matches. */
  hash: string;
}

const POLICIES: { value: RoutingPolicy; label: string }[] = [
  { value: 'local_only', label: 'Local only' },
  { value: 'local_first', label: 'Local first' },
  { value: 'balanced', label: 'Balanced' },
  { value: 'best_quality', label: 'Best quality' },
  { value: 'cloud_allowed', label: 'Cloud allowed' },
];

type ProviderId = 'anthropic' | 'openrouter' | 'ollama' | 'lmstudio';

const PROVIDER_LABELS: Record<ProviderId, string> = {
  anthropic: 'Anthropic',
  openrouter: 'OpenRouter',
  ollama: 'Ollama (local)',
  lmstudio: 'LM Studio (local)',
};

/** Local servers need no credential — the key form is hidden for them. */
const LOCAL_PROVIDERS: ProviderId[] = ['ollama', 'lmstudio'];
const isLocalProvider = (id: ProviderId) => LOCAL_PROVIDERS.includes(id);

export function AssistantPanel({ notes, linkIndex, focusPath, root, onApplied }: Props) {
  const [provider, setProvider] = useState<ProviderId>('anthropic');
  const [status, setStatus] = useState<CredentialStatus | null>(null);
  const [keyInput, setKeyInput] = useState('');
  const [models, setModels] = useState<ModelCapabilities[]>([]);
  const [catalogueError, setCatalogueError] = useState<string | null>(null);
  const [model, setModel] = useState('claude-opus-5');
  const [policy, setPolicy] = useState<RoutingPolicy>('cloud_allowed');
  const [route, setRoute] = useState<RouteDecision | null>(null);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [agentId, setAgentId] = useState(AGENTS[0]?.id ?? 'writing_partner');
  const [pov, setPov] = useState('');
  const [sceneId, setSceneId] = useState('');
  const [prompt, setPrompt] = useState('');
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [answer, setAnswer] = useState<string | null>(null);
  const [usage, setUsage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [proposeEdit, setProposeEdit] = useState(false);
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [applied, setApplied] = useState<string | null>(null);

  const agent = agentById(agentId);

  // Credentials and catalogue are per-provider, so both reload on switch.
  const loadProvider = useCallback((id: ProviderId) => {
    setCatalogueError(null);
    if (isLocalProvider(id)) {
      // No credential involved; the catalogue comes from the running server.
      setStatus({ provider: id, configured: true, hint: null });
      localModels(id).then(
        (all) => {
          setModels(all);
          setModel((current) =>
            all.some((m) => m.model === current) ? current : (all[0]?.model ?? ''),
          );
        },
        (e: unknown) => {
          setModels([]);
          setCatalogueError(typeof e === 'string' ? e : String(e));
        },
      );
      return;
    }
    providerStatus(id).then(setStatus, () => {
      setStatus(null);
    });
    if (id === 'anthropic') {
      modelRegistry().then(
        (all) => {
          const mine = all.filter((m) => m.provider === 'anthropic');
          setModels(mine);
          setModel((current) =>
            mine.some((m) => m.model === current) ? current : (mine[0]?.model ?? current),
          );
        },
        () => {
          setModels([]);
        },
      );
    } else {
      // OpenRouter's catalogue is fetched live; it needs a key first.
      openrouterModels().then(
        (all) => {
          setModels(all);
          setModel((current) =>
            all.some((m) => m.model === current) ? current : (all[0]?.model ?? current),
          );
        },
        (e: unknown) => {
          setModels([]);
          setCatalogueError(typeof e === 'string' ? e : String(e));
        },
      );
    }
  }, []);

  useEffect(() => {
    loadProvider(provider);
  }, [provider, loadProvider]);

  // The route is resolved before sending so the destination is never implied.
  useEffect(() => {
    if (model === '') {
      setRoute(null);
      setRouteError(null);
      return;
    }
    previewRoute(provider, model, policy).then(
      (decision) => {
        setRoute(decision);
        setRouteError(null);
      },
      (e: unknown) => {
        setRoute(null);
        setRouteError(typeof e === 'string' ? e : String(e));
      },
    );
  }, [provider, model, policy]);

  const knowledge = useMemo(() => buildKnowledgeModel(notes), [notes]);
  const characters = knowledge.observers.filter((o) => o !== 'audience');
  const scenes = useMemo(() => {
    const seen: string[] = [];
    for (const s of knowledge.snapshots) if (!seen.includes(s.sceneId)) seen.push(s.sceneId);
    return seen;
  }, [knowledge]);

  const context = useMemo(() => {
    if (!linkIndex) return null;
    const built = buildAgentContext({
      notes,
      linkIndex,
      focusPath,
      povCharacterId: agent?.usesPointOfView === true && pov !== '' ? pov : null,
      sceneId: sceneId === '' ? null : sceneId,
    });
    return {
      ...built,
      items: built.items.map((i) => ({ ...i, included: !excluded.has(i.id) })),
    };
  }, [notes, linkIndex, focusPath, agent, pov, sceneId, excluded]);

  const includedTokens =
    context?.items.filter((i) => i.included).reduce((sum, i) => sum + i.tokens, 0) ?? 0;

  const toggle = (id: string) => {
    setExcluded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const saveKey = useCallback(() => {
    const key = keyInput.trim();
    if (key === '') return;
    setBusy(true);
    setError(null);
    setProviderKey(provider, key)
      .then((s) => {
        setStatus(s);
        setKeyInput('');
        // A fresh key may unlock the catalogue.
        loadProvider(provider);
      })
      .catch((e: unknown) => {
        setError(typeof e === 'string' ? e : String(e));
      })
      .finally(() => {
        setBusy(false);
      });
  }, [keyInput, provider, loadProvider]);

  const focusNote = notes.find((n) => n.path === focusPath) ?? null;
  const canPropose = focusNote !== null;

  const ask = useCallback(() => {
    if (!context || !agent || prompt.trim() === '') return;
    const guard = spoilerInstruction(context, agent.usesPointOfView && pov !== '' ? pov : null);

    // In propose mode the model must return the whole revised file and
    // nothing else, so the response can be diffed against the note.
    const editRule =
      proposeEdit && focusNote
        ? [
            `You are proposing a revision to ${focusNote.path}.`,
            'Return the complete revised file and nothing else: no commentary,',
            'no explanation, no code fences. Preserve the YAML frontmatter,',
            'including fields you did not change. Change only what the request',
            'asks for; leave the rest byte-for-byte identical.',
          ].join(' ')
        : null;

    const system = [agent.system, guard, editRule].filter(Boolean).join('\n\n');
    const userContent = `${renderContext(context)}\n\n${prompt.trim()}`;

    setBusy(true);
    setError(null);
    setAnswer(null);
    setProposal(null);
    setApplied(null);

    // Hash before sending: this is what the apply is checked against.
    const hashPromise =
      proposeEdit && focusNote ? noteHash(root, focusNote.path) : Promise.resolve('');

    hashPromise
      .then(async (hash) => {
        const response = await agentComplete(
          { provider, model, system, messages: [{ role: 'user', content: userContent }] },
          policy,
        );
        setUsage(
          `${response.model} · ${String(response.input_tokens)} in / ${String(
            response.output_tokens,
          )} out · ${response.stop_reason ?? 'no stop reason'}`,
        );
        if (proposeEdit && focusNote) {
          setProposal({
            path: focusNote.path,
            before: focusNote.source,
            after: stripCodeFence(response.text),
            hash,
          });
        } else {
          setAnswer(response.text);
        }
      })
      .catch((e: unknown) => {
        setError(typeof e === 'string' ? e : e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        setBusy(false);
      });
  }, [context, agent, prompt, pov, provider, model, policy, proposeEdit, focusNote, root]);

  const apply = useCallback(() => {
    if (!proposal) return;
    setBusy(true);
    setError(null);
    applyPatch(root, proposal.path, proposal.hash, proposal.after)
      .then(async () => {
        setProposal(null);
        setApplied(`Applied to ${proposal.path}.`);
        await onApplied();
      })
      .catch((e: unknown) => {
        setError(typeof e === 'string' ? e : e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        setBusy(false);
      });
  }, [proposal, root, onApplied]);

  return (
    <div className="assistant">
      <div className="assistant-config">
        <label className="inline">
          Agent
          <select
            value={agentId}
            onChange={(e) => {
              setAgentId(e.target.value);
            }}
          >
            {AGENTS.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>
        <label className="inline">
          Provider
          <select
            value={provider}
            onChange={(e) => {
              setProvider(e.target.value as ProviderId);
            }}
          >
            {(Object.keys(PROVIDER_LABELS) as ProviderId[]).map((p) => (
              <option key={p} value={p}>
                {PROVIDER_LABELS[p]}
              </option>
            ))}
          </select>
        </label>
        <label className="inline">
          Model
          {models.length > 0 ? (
            <select
              value={model}
              onChange={(e) => {
                setModel(e.target.value);
              }}
            >
              {models.map((m) => (
                <option key={m.model} value={m.model}>
                  {m.display_name}
                </option>
              ))}
            </select>
          ) : (
            // No catalogue yet — accept a model id directly so a known
            // checkpoint is still reachable.
            <input
              value={model}
              spellCheck={false}
              placeholder="vendor/model"
              onChange={(e) => {
                setModel(e.target.value);
              }}
            />
          )}
        </label>
        <label className="inline">
          Routing
          <select
            value={policy}
            onChange={(e) => {
              setPolicy(e.target.value as RoutingPolicy);
            }}
          >
            {POLICIES.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
        {agent?.usesPointOfView === true && (
          <label className="inline">
            POV
            <select
              value={pov}
              onChange={(e) => {
                setPov(e.target.value);
              }}
            >
              <option value="">omniscient</option>
              {characters.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
        )}
        {scenes.length > 0 && (
          <label className="inline">
            As of
            <select
              value={sceneId}
              onChange={(e) => {
                setSceneId(e.target.value);
              }}
            >
              <option value="">end of story</option>
              {scenes.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      {agent && <p className="hint">{agent.purpose}</p>}

      {isLocalProvider(provider) ? (
        <p className="hint">
          Runs on this machine — no API key, and project content never leaves it.
        </p>
      ) : status?.configured !== true ? (
        <div className="key-setup">
          <p className="hint">
            A {PROVIDER_LABELS[provider]} API key is required. It is stored in the OS credential
            manager and is never sent to this window or written into your vault.
          </p>
          <div className="row">
            <input
              type="password"
              value={keyInput}
              placeholder={provider === 'anthropic' ? 'sk-ant-…' : 'sk-or-…'}
              spellCheck={false}
              onChange={(e) => {
                setKeyInput(e.target.value);
              }}
            />
            <button disabled={busy || keyInput.trim() === ''} onClick={saveKey}>
              Save key
            </button>
          </div>
        </div>
      ) : (
        <p className="hint">
          {PROVIDER_LABELS[provider]} key stored <span className="badge ok">{status.hint}</span>
          <button
            className="link-btn"
            onClick={() => {
              clearProviderKey(provider).then(
                (s) => {
                  setStatus(s);
                  setModels([]);
                },
                () => undefined,
              );
            }}
          >
            clear
          </button>
        </p>
      )}
      {catalogueError !== null && (
        <p className={isLocalProvider(provider) ? 'error' : 'hint'}>
          Model list unavailable: {catalogueError}
        </p>
      )}

      {routeError !== null && <p className="error">Routing refused: {routeError}</p>}
      {route && (
        <p className={route.privacy_class === 'cloud' ? 'route cloud' : 'route local'}>
          {route.rationale}
        </p>
      )}

      <h3>Context ({includedTokens.toLocaleString()} est. tokens)</h3>
      <ul className="context-items">
        {context?.items.length === 0 && <li className="hint">Select a note to build context.</li>}
        {context?.items.map((item) => (
          <li key={item.id}>
            <label className="inline">
              <input
                type="checkbox"
                checked={item.included}
                onChange={() => {
                  toggle(item.id);
                }}
              />
              <span className={`badge kind-${item.kind}`}>{item.kind}</span>
              {item.label}
              <span className="count-muted">{item.tokens}</span>
            </label>
          </li>
        ))}
      </ul>

      {context && context.withheld.length > 0 && (
        <>
          <h3>Withheld ({context.withheld.length})</h3>
          <ul className="withheld">
            {context.withheld.map((w) => (
              <li key={w.fact}>
                <span className="rel-type">{w.fact}</span>
                <span className="hint">{w.reason}</span>
              </li>
            ))}
          </ul>
        </>
      )}

      <label className="inline propose-toggle">
        <input
          type="checkbox"
          checked={proposeEdit && canPropose}
          disabled={!canPropose}
          onChange={(e) => {
            setProposeEdit(e.target.checked);
            setProposal(null);
          }}
        />
        Propose an edit to this note
        {!canPropose && <span className="hint"> — select a note first</span>}
      </label>

      <textarea
        className="assistant-prompt"
        value={prompt}
        placeholder={
          proposeEdit && canPropose
            ? 'Describe the change to make…'
            : 'Ask about the selected note…'
        }
        onChange={(e) => {
          setPrompt(e.target.value);
        }}
      />
      <div className="row">
        <button
          disabled={busy || prompt.trim() === '' || route === null || status?.configured !== true}
          onClick={ask}
        >
          {busy ? 'Asking…' : proposeEdit && canPropose ? 'Propose' : 'Ask'}
        </button>
      </div>

      {error !== null && <p className="error">{error}</p>}
      {applied !== null && <p className="applied">{applied}</p>}

      {proposal !== null && (
        <>
          <h3>Proposed change</h3>
          {usage !== null && <p className="hint">{usage}</p>}
          <PatchReview
            path={proposal.path}
            before={proposal.before}
            after={proposal.after}
            busy={busy}
            onApply={apply}
            onReject={() => {
              setProposal(null);
            }}
          />
        </>
      )}

      {answer !== null && (
        <>
          <h3>Response</h3>
          {usage !== null && <p className="hint">{usage}</p>}
          <pre className="assistant-answer">{answer}</pre>
          <p className="hint">
            Nothing has been written to your vault — copy anything you want to keep, or use
            &ldquo;Propose an edit&rdquo; to review it as a change.
          </p>
        </>
      )}
    </div>
  );
}
