//! Local model servers (Ollama, LM Studio).
//!
//! Both expose an OpenAI-compatible `/v1/chat/completions` endpoint, so one
//! adapter serves both — they differ only in default port. Neither requires a
//! credential by default, which is the point: with a local provider selected,
//! project content never leaves the machine, and the `LocalOnly` routing
//! policy finally has somewhere to route.

use std::time::Duration;

use serde::{Deserialize, Serialize};

use super::gateway::{ModelCapabilities, PrivacyClass};
use super::AgentError;
use super::{CompletionRequest, CompletionResponse};

pub const OLLAMA: &str = "ollama";
pub const LM_STUDIO: &str = "lmstudio";

const DEFAULT_MAX_TOKENS: u32 = 16_000;

/// Well-known default endpoints. A later increment can make these
/// configurable; until then a non-default port simply fails to connect with a
/// message naming the address it tried.
pub fn base_url(provider: &str) -> Option<&'static str> {
    match provider {
        OLLAMA => Some("http://localhost:11434/v1"),
        LM_STUDIO => Some("http://localhost:1234/v1"),
        _ => None,
    }
}

pub fn is_local_provider(provider: &str) -> bool {
    base_url(provider).is_some()
}

fn client() -> Result<reqwest::blocking::Client, AgentError> {
    reqwest::blocking::Client::builder()
        // Local generation on modest hardware is slow; a short timeout would
        // look like a broken server.
        .timeout(Duration::from_secs(900))
        .build()
        .map_err(|e| AgentError::Request(e.to_string()))
}

fn endpoint(provider: &str, path: &str) -> Result<String, AgentError> {
    let base =
        base_url(provider).ok_or_else(|| AgentError::UnknownProvider(provider.to_string()))?;
    Ok(format!("{base}{path}"))
}

/// A connection failure to localhost almost always means the server is not
/// running, which is worth saying outright rather than surfacing a socket error.
fn connection_hint(provider: &str, error: &str) -> String {
    let url = base_url(provider).unwrap_or("its configured address");
    let name = if provider == OLLAMA {
        "Ollama"
    } else {
        "LM Studio"
    };
    format!("could not reach {name} at {url} — is it running? ({error})")
}

#[derive(Serialize)]
struct WireRequest<'a> {
    model: &'a str,
    messages: Vec<WireMessage<'a>>,
    max_tokens: u32,
}

#[derive(Serialize)]
struct WireMessage<'a> {
    role: &'a str,
    content: &'a str,
}

#[derive(Deserialize)]
struct WireResponse {
    #[serde(default)]
    model: String,
    #[serde(default)]
    choices: Vec<WireChoice>,
    #[serde(default)]
    usage: WireUsage,
}

#[derive(Deserialize)]
struct WireChoice {
    #[serde(default)]
    message: Option<WireChoiceMessage>,
    #[serde(default)]
    finish_reason: Option<String>,
}

#[derive(Deserialize)]
struct WireChoiceMessage {
    #[serde(default)]
    content: Option<String>,
}

#[derive(Deserialize, Default)]
struct WireUsage {
    #[serde(default)]
    prompt_tokens: u32,
    #[serde(default)]
    completion_tokens: u32,
}

pub fn complete(
    provider: &str,
    request: &CompletionRequest,
) -> Result<CompletionResponse, AgentError> {
    let model = request
        .model
        .as_deref()
        .ok_or_else(|| AgentError::Request(format!("no model selected for {provider}")))?;

    let mut messages: Vec<WireMessage<'_>> = Vec::new();
    if let Some(system) = request.system.as_deref() {
        messages.push(WireMessage {
            role: "system",
            content: system,
        });
    }
    for m in &request.messages {
        messages.push(WireMessage {
            role: m.role.as_str(),
            content: m.content.as_str(),
        });
    }

    let body = WireRequest {
        model,
        messages,
        max_tokens: request.max_tokens.unwrap_or(DEFAULT_MAX_TOKENS),
    };

    let response = client()?
        .post(endpoint(provider, "/chat/completions")?)
        .header("content-type", "application/json")
        .json(&body)
        .send()
        .map_err(|e| AgentError::Request(connection_hint(provider, &e.to_string())))?;

    let status = response.status();
    let text = response
        .text()
        .map_err(|e| AgentError::Request(e.to_string()))?;

    if !status.is_success() {
        return Err(AgentError::Api {
            status: status.as_u16(),
            message: text,
        });
    }
    parse_chat(&text)
}

fn parse_chat(body: &str) -> Result<CompletionResponse, AgentError> {
    let parsed: WireResponse =
        serde_json::from_str(body).map_err(|e| AgentError::Request(e.to_string()))?;
    let choice = parsed
        .choices
        .into_iter()
        .next()
        .ok_or_else(|| AgentError::Request("local server returned no choices".into()))?;

    Ok(CompletionResponse {
        text: choice.message.and_then(|m| m.content).unwrap_or_default(),
        model: parsed.model,
        stop_reason: choice.finish_reason,
        input_tokens: parsed.usage.prompt_tokens,
        output_tokens: parsed.usage.completion_tokens,
    })
}

#[derive(Deserialize)]
struct WireModelList {
    #[serde(default)]
    data: Vec<WireModel>,
}

#[derive(Deserialize)]
struct WireModel {
    id: String,
}

pub fn list_models(provider: &str) -> Result<Vec<ModelCapabilities>, AgentError> {
    let response = client()?
        .get(endpoint(provider, "/models")?)
        .send()
        .map_err(|e| AgentError::Request(connection_hint(provider, &e.to_string())))?;

    let status = response.status();
    let text = response
        .text()
        .map_err(|e| AgentError::Request(e.to_string()))?;
    if !status.is_success() {
        return Err(AgentError::Api {
            status: status.as_u16(),
            message: text,
        });
    }
    parse_models(provider, &text)
}

fn parse_models(provider: &str, body: &str) -> Result<Vec<ModelCapabilities>, AgentError> {
    let parsed: WireModelList =
        serde_json::from_str(body).map_err(|e| AgentError::Request(e.to_string()))?;
    let mut models: Vec<ModelCapabilities> = parsed
        .data
        .into_iter()
        .map(|m| ModelCapabilities {
            provider: provider.to_string(),
            display_name: m.id.clone(),
            model: m.id,
            privacy_class: PrivacyClass::Local,
            // Local servers do not report these; leaving them at zero is
            // honest — the UI shows "unknown" rather than an invented number.
            context_tokens: 0,
            max_output_tokens: 0,
            vision: false,
            tool_calling: false,
            structured_output: false,
            streaming: true,
            input_cost_per_mtok: None,
            output_cost_per_mtok: None,
        })
        .collect();
    models.sort_by(|a, b| a.model.cmp(&b.model));
    Ok(models)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn known_providers_have_distinct_endpoints() {
        assert!(base_url(OLLAMA).is_some());
        assert!(base_url(LM_STUDIO).is_some());
        assert_ne!(base_url(OLLAMA), base_url(LM_STUDIO));
        assert!(base_url("anthropic").is_none());
    }

    #[test]
    fn endpoints_join_without_double_slashes() {
        assert_eq!(
            endpoint(OLLAMA, "/chat/completions").unwrap(),
            "http://localhost:11434/v1/chat/completions"
        );
        assert_eq!(
            endpoint(LM_STUDIO, "/models").unwrap(),
            "http://localhost:1234/v1/models"
        );
    }

    #[test]
    fn unknown_provider_is_rejected() {
        assert!(matches!(
            endpoint("nope", "/models"),
            Err(AgentError::UnknownProvider(_))
        ));
    }

    #[test]
    fn connection_failures_name_the_server_and_address() {
        let hint = connection_hint(OLLAMA, "connection refused");
        assert!(hint.contains("Ollama"));
        assert!(hint.contains("11434"));
        assert!(hint.contains("is it running?"));
    }

    #[test]
    fn parses_an_openai_shaped_response() {
        let body = r#"{
            "model": "llama3.2:3b",
            "choices": [{"message": {"role": "assistant", "content": "hi"}, "finish_reason": "stop"}],
            "usage": {"prompt_tokens": 4, "completion_tokens": 1}
        }"#;
        let parsed = parse_chat(body).unwrap();
        assert_eq!(parsed.text, "hi");
        assert_eq!(parsed.model, "llama3.2:3b");
        assert_eq!(parsed.input_tokens, 4);
    }

    #[test]
    fn empty_choices_is_an_error_not_empty_text() {
        assert!(parse_chat(r#"{"model":"m","choices":[]}"#).is_err());
    }

    #[test]
    fn local_models_are_classified_local_so_local_only_can_route() {
        let models =
            parse_models(OLLAMA, r#"{"data":[{"id":"llama3.2:3b"},{"id":"qwen"}]}"#).unwrap();
        assert_eq!(models.len(), 2);
        assert!(models
            .iter()
            .all(|m| m.privacy_class == PrivacyClass::Local));
        assert!(models.iter().all(|m| m.provider == OLLAMA));
        // Sorted for a stable picker.
        assert_eq!(models[0].model, "llama3.2:3b");
    }

    #[test]
    fn unknown_capabilities_are_left_at_zero_rather_than_invented() {
        let models = parse_models(LM_STUDIO, r#"{"data":[{"id":"m"}]}"#).unwrap();
        assert_eq!(models[0].context_tokens, 0);
        assert_eq!(models[0].input_cost_per_mtok, None);
    }

    #[test]
    fn an_empty_catalogue_is_not_an_error() {
        assert_eq!(parse_models(OLLAMA, r#"{"data":[]}"#).unwrap().len(), 0);
    }
}
