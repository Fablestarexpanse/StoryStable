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
pub fn route(model: &str, policy: RoutingPolicy) -> Result<RouteDecision, AgentError> {
    let caps = find_model(model).ok_or_else(|| AgentError::UnknownProvider(model.to_string()))?;

    if caps.privacy_class == PrivacyClass::Cloud && !policy.allows_cloud() {
        return Err(AgentError::PolicyForbidsCloud {
            policy: policy.label().to_string(),
            provider: caps.provider,
        });
    }

    let rationale = match caps.privacy_class {
        PrivacyClass::Local => format!("{} runs locally; nothing leaves this machine.", caps.model),
        PrivacyClass::Cloud => format!(
            "Project content in this request is sent to {} under policy \"{}\".",
            caps.provider,
            policy.label()
        ),
    };

    Ok(RouteDecision {
        provider: caps.provider,
        model: caps.model,
        privacy_class: caps.privacy_class,
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
        let err = route("claude-opus-5", RoutingPolicy::LocalOnly).unwrap_err();
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
            assert!(route("claude-opus-5", policy).is_ok(), "{policy:?}");
        }
    }

    #[test]
    fn route_reports_the_destination_for_display() {
        let decision = route("claude-opus-5", RoutingPolicy::CloudAllowed).unwrap();
        assert_eq!(decision.privacy_class, PrivacyClass::Cloud);
        assert!(decision.rationale.contains("anthropic"));
        assert!(decision.rationale.contains("cloud_allowed"));
    }

    #[test]
    fn unknown_model_is_rejected_before_any_call() {
        assert!(matches!(
            route("gpt-imaginary", RoutingPolicy::CloudAllowed),
            Err(AgentError::UnknownProvider(_))
        ));
    }

    #[test]
    fn default_model_is_the_current_opus() {
        assert!(find_model("claude-opus-5").is_some());
    }
}
