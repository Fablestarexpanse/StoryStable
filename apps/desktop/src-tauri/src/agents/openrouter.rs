//! OpenRouter provider adapter.
//!
//! OpenRouter exposes an OpenAI-compatible chat-completions endpoint that
//! fronts many model families, so this adapter is deliberately generic — no
//! Anthropic-specific request shaping. Like the Anthropic adapter, the call
//! is made from Rust so the key never enters the webview.
//!
//! Its model catalogue is fetched live rather than hard-coded: the whole
//! point of routing through OpenRouter is reaching whatever checkpoints the
//! account can see.

use std::time::Duration;

use serde::{Deserialize, Serialize};

use super::gateway::{ModelCapabilities, PrivacyClass};
use super::secrets;
use super::AgentError;
use super::{CompletionRequest, CompletionResponse};

const CHAT_URL: &str = "https://openrouter.ai/api/v1/chat/completions";
const MODELS_URL: &str = "https://openrouter.ai/api/v1/models";
pub const PROVIDER: &str = "openrouter";
const DEFAULT_MAX_TOKENS: u32 = 16_000;

/// Sent so usage is attributable in the OpenRouter dashboard. Not a secret.
const APP_TITLE: &str = "StoryStable";
const APP_URL: &str = "https://github.com/Fablestarexpanse/StoryStable";

fn client() -> Result<reqwest::blocking::Client, AgentError> {
    reqwest::blocking::Client::builder()
        .timeout(Duration::from_secs(600))
        .build()
        .map_err(|e| AgentError::Request(e.to_string()))
}

// --- chat -----------------------------------------------------------------

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
    /// OpenRouter can return a 200 whose body carries an error object.
    #[serde(default)]
    error: Option<WireErrorBody>,
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

#[derive(Deserialize)]
struct WireErrorEnvelope {
    error: WireErrorBody,
}

#[derive(Deserialize)]
struct WireErrorBody {
    message: String,
}

pub fn complete(request: &CompletionRequest) -> Result<CompletionResponse, AgentError> {
    let key = secrets::get_key(PROVIDER)?;
    let model = request
        .model
        .as_deref()
        .ok_or_else(|| AgentError::Request("no model selected for OpenRouter".into()))?;

    // OpenAI-compatible: the system prompt is a message, not a top-level field.
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
        .post(CHAT_URL)
        .bearer_auth(&key)
        .header("HTTP-Referer", APP_URL)
        .header("X-Title", APP_TITLE)
        .header("content-type", "application/json")
        .json(&body)
        .send()
        .map_err(|e| {
            AgentError::Request(secrets::redact(&e.to_string(), std::slice::from_ref(&key)))
        })?;

    let status = response.status();
    let text = response.text().map_err(|e| {
        AgentError::Request(secrets::redact(&e.to_string(), std::slice::from_ref(&key)))
    })?;

    if !status.is_success() {
        let message = serde_json::from_str::<WireErrorEnvelope>(&text)
            .map(|e| e.error.message)
            .unwrap_or_else(|_| text.clone());
        return Err(AgentError::Api {
            status: status.as_u16(),
            message: secrets::redact(&message, std::slice::from_ref(&key)),
        });
    }

    parse_chat(&text)
}

fn parse_chat(body: &str) -> Result<CompletionResponse, AgentError> {
    let parsed: WireResponse =
        serde_json::from_str(body).map_err(|e| AgentError::Request(e.to_string()))?;

    // A 200 carrying an error object is still a failure.
    if let Some(error) = parsed.error {
        return Err(AgentError::Api {
            status: 200,
            message: error.message,
        });
    }

    let choice = parsed
        .choices
        .into_iter()
        .next()
        .ok_or_else(|| AgentError::Request("provider returned no choices".into()))?;

    let finish = choice.finish_reason.clone();
    if finish.as_deref() == Some("content_filter") {
        return Err(AgentError::Refusal {
            category: "content_filter".into(),
        });
    }

    let text = choice.message.and_then(|m| m.content).unwrap_or_default();

    Ok(CompletionResponse {
        text,
        model: parsed.model,
        stop_reason: finish,
        input_tokens: parsed.usage.prompt_tokens,
        output_tokens: parsed.usage.completion_tokens,
    })
}

// --- model catalogue ------------------------------------------------------

#[derive(Deserialize)]
struct WireModelList {
    data: Vec<WireModel>,
}

#[derive(Deserialize)]
struct WireModel {
    id: String,
    #[serde(default)]
    name: Option<String>,
    #[serde(default)]
    context_length: Option<u32>,
    #[serde(default)]
    pricing: Option<WirePricing>,
    #[serde(default)]
    architecture: Option<WireArchitecture>,
    #[serde(default)]
    top_provider: Option<WireTopProvider>,
}

#[derive(Deserialize)]
struct WirePricing {
    /// USD per token, as a decimal string.
    #[serde(default)]
    prompt: Option<String>,
    #[serde(default)]
    completion: Option<String>,
}

#[derive(Deserialize)]
struct WireArchitecture {
    #[serde(default)]
    input_modalities: Option<Vec<String>>,
}

#[derive(Deserialize)]
struct WireTopProvider {
    #[serde(default)]
    max_completion_tokens: Option<u32>,
}

/// Per-token price string → USD per million tokens.
fn per_mtok(value: Option<&String>) -> Option<f64> {
    let parsed: f64 = value?.parse().ok()?;
    if parsed <= 0.0 {
        return None;
    }
    Some(parsed * 1_000_000.0)
}

pub fn list_models() -> Result<Vec<ModelCapabilities>, AgentError> {
    let key = secrets::get_key(PROVIDER)?;
    let response = client()?
        .get(MODELS_URL)
        .bearer_auth(&key)
        .send()
        .map_err(|e| {
            AgentError::Request(secrets::redact(&e.to_string(), std::slice::from_ref(&key)))
        })?;

    let status = response.status();
    let text = response.text().map_err(|e| {
        AgentError::Request(secrets::redact(&e.to_string(), std::slice::from_ref(&key)))
    })?;

    if !status.is_success() {
        return Err(AgentError::Api {
            status: status.as_u16(),
            message: secrets::redact(&text, std::slice::from_ref(&key)),
        });
    }

    parse_models(&text)
}

fn parse_models(body: &str) -> Result<Vec<ModelCapabilities>, AgentError> {
    let parsed: WireModelList =
        serde_json::from_str(body).map_err(|e| AgentError::Request(e.to_string()))?;

    let mut models: Vec<ModelCapabilities> = parsed
        .data
        .into_iter()
        .map(|m| {
            let vision = m
                .architecture
                .and_then(|a| a.input_modalities)
                .map(|mods| mods.iter().any(|x| x == "image"))
                .unwrap_or(false);
            let pricing = m.pricing.unwrap_or(WirePricing {
                prompt: None,
                completion: None,
            });
            ModelCapabilities {
                display_name: m.name.unwrap_or_else(|| m.id.clone()),
                provider: PROVIDER.to_string(),
                model: m.id,
                privacy_class: PrivacyClass::Cloud,
                context_tokens: m.context_length.unwrap_or(0),
                max_output_tokens: m
                    .top_provider
                    .and_then(|t| t.max_completion_tokens)
                    .unwrap_or(0),
                vision,
                // Not reliably reported per-model by the catalogue; assumed
                // available rather than advertised as guaranteed.
                tool_calling: true,
                structured_output: false,
                streaming: true,
                input_cost_per_mtok: per_mtok(pricing.prompt.as_ref()),
                output_cost_per_mtok: per_mtok(pricing.completion.as_ref()),
            }
        })
        .collect();

    models.sort_by(|a, b| a.model.cmp(&b.model));
    Ok(models)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_a_normal_chat_response() {
        let body = r#"{
            "model": "anthropic/claude-opus-4.5",
            "choices": [{"message": {"role": "assistant", "content": "Hi"}, "finish_reason": "stop"}],
            "usage": {"prompt_tokens": 10, "completion_tokens": 2}
        }"#;
        let parsed = parse_chat(body).unwrap();
        assert_eq!(parsed.text, "Hi");
        assert_eq!(parsed.input_tokens, 10);
        assert_eq!(parsed.stop_reason.as_deref(), Some("stop"));
    }

    #[test]
    fn treats_a_200_with_an_error_body_as_a_failure() {
        let body = r#"{"error": {"message": "insufficient credits", "code": 402}}"#;
        match parse_chat(body) {
            Err(AgentError::Api { message, .. }) => assert!(message.contains("insufficient")),
            other => panic!("expected api error, got {other:?}"),
        }
    }

    #[test]
    fn content_filter_is_reported_as_a_refusal() {
        let body = r#"{
            "model": "x/y",
            "choices": [{"message": {"content": ""}, "finish_reason": "content_filter"}]
        }"#;
        assert!(matches!(parse_chat(body), Err(AgentError::Refusal { .. })));
    }

    #[test]
    fn empty_choices_is_an_error_not_empty_text() {
        let body = r#"{"model": "x/y", "choices": []}"#;
        assert!(parse_chat(body).is_err());
    }

    #[test]
    fn tolerates_a_missing_content_field() {
        let body = r#"{
            "model": "x/y",
            "choices": [{"message": {"role": "assistant"}, "finish_reason": "stop"}]
        }"#;
        assert_eq!(parse_chat(body).unwrap().text, "");
    }

    #[test]
    fn parses_the_model_catalogue() {
        let body = r#"{"data": [
            {
                "id": "anthropic/claude-opus-4.5",
                "name": "Anthropic: Claude Opus 4.5",
                "context_length": 200000,
                "pricing": {"prompt": "0.000005", "completion": "0.000025"},
                "architecture": {"input_modalities": ["text", "image"]},
                "top_provider": {"max_completion_tokens": 64000}
            },
            {"id": "aaa/cheap", "context_length": 8192}
        ]}"#;
        let models = parse_models(body).unwrap();
        assert_eq!(models.len(), 2);
        // Sorted by id.
        assert_eq!(models[0].model, "aaa/cheap");

        let opus = models.iter().find(|m| m.model.contains("opus")).unwrap();
        assert_eq!(opus.display_name, "Anthropic: Claude Opus 4.5");
        assert_eq!(opus.context_tokens, 200_000);
        assert_eq!(opus.max_output_tokens, 64_000);
        assert!(opus.vision);
        assert_eq!(opus.input_cost_per_mtok, Some(5.0));
        assert_eq!(opus.output_cost_per_mtok, Some(25.0));
    }

    #[test]
    fn catalogue_falls_back_gracefully_on_sparse_entries() {
        let models = parse_models(r#"{"data": [{"id": "bare/model"}]}"#).unwrap();
        let m = &models[0];
        assert_eq!(m.display_name, "bare/model");
        assert_eq!(m.context_tokens, 0);
        assert!(!m.vision);
        assert_eq!(m.input_cost_per_mtok, None);
    }

    #[test]
    fn free_models_report_no_price_rather_than_zero() {
        let models = parse_models(
            r#"{"data": [{"id": "free/x", "pricing": {"prompt": "0", "completion": "0"}}]}"#,
        )
        .unwrap();
        assert_eq!(models[0].input_cost_per_mtok, None);
    }

    #[test]
    fn every_catalogue_model_is_classified_cloud() {
        let models = parse_models(r#"{"data": [{"id": "a/b"}, {"id": "c/d"}]}"#).unwrap();
        assert!(models
            .iter()
            .all(|m| m.privacy_class == PrivacyClass::Cloud));
    }

    #[test]
    fn system_prompt_is_sent_as_a_message_not_a_top_level_field() {
        let body = WireRequest {
            model: "a/b",
            messages: vec![
                WireMessage {
                    role: "system",
                    content: "be brief",
                },
                WireMessage {
                    role: "user",
                    content: "hi",
                },
            ],
            max_tokens: 16_000,
        };
        let json = serde_json::to_string(&body).unwrap();
        assert!(json.contains(r#""role":"system""#));
        assert!(!json.contains(r#""system":"#));
    }
}
