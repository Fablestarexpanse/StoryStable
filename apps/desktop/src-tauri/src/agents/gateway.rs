//! Model Gateway: capability registry and routing policy.
//!
//! The gateway decides *whether* a request may reach a provider before any
//! network call is made. Spec §12.6 is explicit that cloud use must never
//! happen silently — so `LocalOnly` refuses rather than falling back, and the
//! decision is reported back to the caller for display in job metadata.

use serde::{Deserialize, Serialize};

use super::AgentError;

/// Where a provider runs. Drives the privacy policy check.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum PrivacyClass {
    /// Runs on this machine; project content never leaves it.
    Local,
    /// Content is sent to a third-party service.
    Cloud,
}

/// Spec §8.1 routing profiles.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum RoutingPolicy {
    LocalOnly,
    LocalFirst,
    Balanced,
    BestQuality,
    CloudAllowed,
}

impl RoutingPolicy {
    fn label(self) -> &'static str {
        match self {
            Self::LocalOnly => "local_only",
            Self::LocalFirst => "local_first",
            Self::Balanced => "balanced",
            Self::BestQuality => "best_quality",
            Self::CloudAllowed => "cloud_allowed",
        }
    }

    /// Whether this policy permits reaching a cloud provider at all.
    ///
    /// `LocalFirst` permits it: "local preferred, cloud requires policy or
    /// approval" (PRODUCT_SPEC §10.2) — preference is expressed by provider
    /// ordering, not by a hard block. Only `LocalOnly` forbids it outright.
    fn allows_cloud(self) -> bool {
        !matches!(self, Self::LocalOnly)
    }
}

/// What a model can do (spec §10.3) — tracked rather than assumed.
#[derive(Debug, Clone, Serialize)]
pub struct ModelCapabilities {
    pub provider: String,
    pub model: String,
    pub display_name: String,
    pub privacy_class: PrivacyClass,
    pub context_tokens: u32,
    pub max_output_tokens: u32,
    pub vision: bool,
    pub tool_calling: bool,
    pub structured_output: bool,
    pub streaming: bool,
    /// USD per million tokens, when published.
    pub input_cost_per_mtok: Option<f64>,
    pub output_cost_per_mtok: Option<f64>,
}

/// The models this build knows how to reach.
///
/// Values are from the Anthropic model catalog at time of writing; the
/// gateway treats them as a cache, not as truth, and a later increment can
/// refresh them from the provider's models endpoint.
pub fn registry() -> Vec<ModelCapabilities> {
    vec![
        ModelCapabilities {
            provider: "anthropic".into(),
            model: "claude-opus-5".into(),
            display_name: "Claude Opus 5".into(),
            privacy_class: PrivacyClass::Cloud,
            context_tokens: 1_000_000,
            max_output_tokens: 128_000,
            vision: true,
            tool_calling: true,
            structured_output: true,
            streaming: true,
            input_cost_per_mtok: Some(5.0),
            output_cost_per_mtok: Some(25.0),
        },
        ModelCapabilities {
            provider: "anthropic".into(),
            model: "claude-sonnet-5".into(),
            display_name: "Claude Sonnet 5".into(),
            privacy_class: PrivacyClass::Cloud,
            context_tokens: 1_000_000,
            max_output_tokens: 128_000,
            vision: true,
            tool_calling: true,
            structured_output: true,
            streaming: true,
            input_cost_per_mtok: Some(3.0),
            output_cost_per_mtok: Some(15.0),
        },
        ModelCapabilities {
            provider: "anthropic".into(),
            model: "claude-haiku-4-5".into(),
            display_name: "Claude Haiku 4.5".into(),
            privacy_class: PrivacyClass::Cloud,
            context_tokens: 200_000,
            max_output_tokens: 64_000,
            vision: true,
            tool_calling: true,
            structured_output: true,
            streaming: true,
            input_cost_per_mtok: Some(1.0),
            output_cost_per_mtok: Some(5.0),
        },
    ]
}

pub fn find_model(model: &str) -> Option<ModelCapabilities> {
    registry().into_iter().find(|m| m.model == model)
}

/// Which provider serves a model id, when the caller did not say.
///
/// Inference is a fallback only. Local models carry bare ids just like
/// first-party ones (`llama3.2:3b`), so nothing in the string distinguishes
/// them — callers pass the provider explicitly, and this exists for requests
/// that predate that.
pub fn provider_for(model: &str) -> Option<String> {
    if let Some(caps) = find_model(model) {
        return Some(caps.provider);
    }
    if model.contains('/') {
        return Some("openrouter".to_string());
    }
    None
}

/// Privacy class for a provider whose capabilities are not in the static
/// registry. Local servers keep content on the machine; anything else is
/// assumed cloud, which is the safe default when we cannot prove otherwise.
fn privacy_for_provider(provider: &str) -> PrivacyClass {
    if super::local::is_local_provider(provider) {
        PrivacyClass::Local
    } else {
        PrivacyClass::Cloud
    }
}

/// The gateway's decision about a request, surfaced so the destination is
/// always visible to the user rather than implied (spec §12.6).
#[derive(Debug, Clone, Serialize)]
pub struct RouteDecision {
    pub provider: String,
    pub model: String,
    pub privacy_class: PrivacyClass,
    pub policy: String,
    /// Human-readable explanation, shown in the context inspector.
    pub rationale: String,
}

/// Resolve a request to a route, or refuse. No network call happens here.
///
/// `provider` is what the caller selected; when absent it is inferred, which
/// only works for models in the static registry or namespaced OpenRouter ids.
pub fn route(
    provider: Option<&str>,
    model: &str,
    policy: RoutingPolicy,
) -> Result<RouteDecision, AgentError> {
    let (provider, privacy_class) = match provider {
        // An explicitly chosen provider wins, but its capabilities are still
        // consulted when the model happens to be in the registry.
        Some(chosen) => {
            let privacy = find_model(model)
                .filter(|caps| caps.provider == chosen)
                .map_or_else(|| privacy_for_provider(chosen), |caps| caps.privacy_class);
            (chosen.to_string(), privacy)
        }
        None => match find_model(model) {
            Some(caps) => (caps.provider, caps.privacy_class),
            None => {
                let inferred = provider_for(model)
                    .ok_or_else(|| AgentError::UnknownProvider(model.to_string()))?;
                let privacy = privacy_for_provider(&inferred);
                (inferred, privacy)
            }
        },
    };

    if privacy_class == PrivacyClass::Cloud && !policy.allows_cloud() {
        return Err(AgentError::PolicyForbidsCloud {
            policy: policy.label().to_string(),
            provider,
        });
    }

    let rationale = match privacy_class {
        PrivacyClass::Local => format!("{model} runs locally; nothing leaves this machine."),
        PrivacyClass::Cloud => format!(
            "Project content in this request is sent to {} under policy \"{}\".",
            provider,
            policy.label()
        ),
    };

    Ok(RouteDecision {
        provider,
        model: model.to_string(),
        privacy_class,
        policy: policy.label().to_string(),
        rationale,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn registry_models_are_unique_and_populated() {
        let models = registry();
        assert!(!models.is_empty());
        let mut ids: Vec<_> = models.iter().map(|m| m.model.clone()).collect();
        ids.sort();
        let count = ids.len();
        ids.dedup();
        assert_eq!(ids.len(), count, "duplicate model ids in registry");
    }

    #[test]
    fn local_only_refuses_cloud_rather_than_falling_back() {
        let err = route(None, "claude-opus-5", RoutingPolicy::LocalOnly).unwrap_err();
        assert!(matches!(err, AgentError::PolicyForbidsCloud { .. }));
    }

    #[test]
    fn permissive_policies_allow_cloud() {
        for policy in [
            RoutingPolicy::LocalFirst,
            RoutingPolicy::Balanced,
            RoutingPolicy::BestQuality,
            RoutingPolicy::CloudAllowed,
        ] {
            assert!(route(None, "claude-opus-5", policy).is_ok(), "{policy:?}");
        }
    }

    #[test]
    fn route_reports_the_destination_for_display() {
        let decision = route(None, "claude-opus-5", RoutingPolicy::CloudAllowed).unwrap();
        assert_eq!(decision.privacy_class, PrivacyClass::Cloud);
        assert!(decision.rationale.contains("anthropic"));
        assert!(decision.rationale.contains("cloud_allowed"));
    }

    #[test]
    fn unknown_bare_model_is_rejected_before_any_call() {
        assert!(matches!(
            route(None, "gpt-imaginary", RoutingPolicy::CloudAllowed),
            Err(AgentError::UnknownProvider(_))
        ));
    }

    #[test]
    fn namespaced_ids_route_to_openrouter_without_a_static_entry() {
        assert_eq!(
            provider_for("meta-llama/llama-4"),
            Some("openrouter".into())
        );
        let decision = route(None, "meta-llama/llama-4", RoutingPolicy::CloudAllowed).unwrap();
        assert_eq!(decision.provider, "openrouter");
        assert_eq!(decision.model, "meta-llama/llama-4");
    }

    #[test]
    fn a_first_party_model_keeps_its_own_provider() {
        assert_eq!(provider_for("claude-opus-5"), Some("anthropic".into()));
    }

    #[test]
    fn an_unknown_openrouter_model_is_still_blocked_by_local_only() {
        // Capabilities are unknown, so it must be assumed cloud rather than
        // waved through.
        assert!(matches!(
            route(None, "vendor/whatever", RoutingPolicy::LocalOnly),
            Err(AgentError::PolicyForbidsCloud { .. })
        ));
    }

    #[test]
    fn local_providers_are_permitted_under_local_only() {
        // The whole point of the policy: with a local server selected,
        // content never leaves the machine, so the request proceeds.
        for provider in ["ollama", "lmstudio"] {
            let decision = route(Some(provider), "llama3.2:3b", RoutingPolicy::LocalOnly)
                .unwrap_or_else(|e| panic!("{provider} should be allowed: {e}"));
            assert_eq!(decision.privacy_class, PrivacyClass::Local);
            assert!(decision.rationale.contains("nothing leaves this machine"));
        }
    }

    #[test]
    fn a_bare_local_model_id_routes_only_when_the_provider_is_explicit() {
        // "llama3.2:3b" has no slash and is not in the registry, so inference
        // cannot place it — the caller must say which provider serves it.
        assert!(route(None, "llama3.2:3b", RoutingPolicy::CloudAllowed).is_err());
        assert!(route(Some("ollama"), "llama3.2:3b", RoutingPolicy::CloudAllowed).is_ok());
    }

    #[test]
    fn an_explicit_cloud_provider_is_still_blocked_by_local_only() {
        assert!(matches!(
            route(Some("openrouter"), "vendor/x", RoutingPolicy::LocalOnly),
            Err(AgentError::PolicyForbidsCloud { .. })
        ));
    }

    #[test]
    fn default_model_is_the_current_opus() {
        assert!(find_model("claude-opus-5").is_some());
    }
}
