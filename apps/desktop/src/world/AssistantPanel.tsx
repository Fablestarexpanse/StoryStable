import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  buildAgentContext,
  renderContext,
  spoilerInstruction,
  AGENTS,
  agentById,
  buildKnowledgeModel,
  type LinkIndex,
  type ParsedNote,
} from '@storystable/vault';
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
  previewRoute,
  agentComplete,
} from '../services/vault.js';

interface Props {
  notes: ParsedNote[];
  linkIndex: LinkIndex | null;
  focusPath: string | null;
}

const POLICIES: { value: RoutingPolicy; label: string }[] = [
  { value: 'local_only', label: 'Local only' },
  { value: 'local_first', label: 'Local first' },
  { value: 'balanced', label: 'Balanced' },
  { value: 'best_quality', label: 'Best quality' },
  { value: 'cloud_allowed', label: 'Cloud allowed' },
];

export function AssistantPanel({ notes, linkIndex, focusPath }: Props) {
  const [status, setStatus] = useState<CredentialStatus | null>(null);
  const [keyInput, setKeyInput] = useState('');
  const [models, setModels] = useState<ModelCapabilities[]>([]);
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

  const agent = agentById(agentId);

  useEffect(() => {
    providerStatus('anthropic').then(setStatus, () => {
      setStatus(null);
    });
    modelRegistry().then(setModels, () => {
      setModels([]);
    });
  }, []);

  // The route is resolved before sending so the destination is never implied.
  useEffect(() => {
    previewRoute(model, policy).then(
      (decision) => {
        setRoute(decision);
        setRouteError(null);
      },
      (e: unknown) => {
        setRoute(null);
        setRouteError(typeof e === 'string' ? e : String(e));
      },
    );
  }, [model, policy]);

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
    setProviderKey('anthropic', key)
      .then((s) => {
        setStatus(s);
        setKeyInput('');
      })
      .catch((e: unknown) => {
        setError(typeof e === 'string' ? e : String(e));
      })
      .finally(() => {
        setBusy(false);
      });
  }, [keyInput]);

  const ask = useCallback(() => {
    if (!context || !agent || prompt.trim() === '') return;
    const guard = spoilerInstruction(context, agent.usesPointOfView && pov !== '' ? pov : null);
    const system = [agent.system, guard].filter(Boolean).join('\n\n');
    const userContent = `${renderContext(context)}\n\n${prompt.trim()}`;

    setBusy(true);
    setError(null);
    setAnswer(null);
    agentComplete({ model, system, messages: [{ role: 'user', content: userContent }] }, policy)
      .then((response) => {
        setAnswer(response.text);
        setUsage(
          `${response.model} · ${String(response.input_tokens)} in / ${String(
            response.output_tokens,
          )} out · ${response.stop_reason ?? 'no stop reason'}`,
        );
      })
      .catch((e: unknown) => {
        setError(typeof e === 'string' ? e : e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        setBusy(false);
      });
  }, [context, agent, prompt, pov, model, policy]);

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
          Model
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

      {status?.configured !== true ? (
        <div className="key-setup">
          <p className="hint">
            An Anthropic API key is required. It is stored in the OS credential manager and is never
            sent to this window or written into your vault.
          </p>
          <div className="row">
            <input
              type="password"
              value={keyInput}
              placeholder="sk-ant-…"
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
          Key stored <span className="badge ok">{status.hint}</span>
          <button
            className="link-btn"
            onClick={() => {
              clearProviderKey('anthropic').then(setStatus, () => undefined);
            }}
          >
            clear
          </button>
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

      <textarea
        className="assistant-prompt"
        value={prompt}
        placeholder="Ask about the selected note…"
        onChange={(e) => {
          setPrompt(e.target.value);
        }}
      />
      <div className="row">
        <button
          disabled={busy || prompt.trim() === '' || route === null || status?.configured !== true}
          onClick={ask}
        >
          {busy ? 'Asking…' : 'Ask'}
        </button>
      </div>

      {error !== null && <p className="error">{error}</p>}
      {answer !== null && (
        <>
          <h3>Response</h3>
          {usage !== null && <p className="hint">{usage}</p>}
          <pre className="assistant-answer">{answer}</pre>
          <p className="hint">
            This is a proposal. Nothing has been written to your vault — copy anything you want to
            keep.
          </p>
        </>
      )}
    </div>
  );
}
