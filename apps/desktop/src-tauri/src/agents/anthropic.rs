//! Anthropic provider adapter.
//!
//! Rust has no official Anthropic SDK, so this speaks the Messages API over
//! raw HTTP. The call lives in Rust rather than the webview specifically so
//! the API key never enters a browser context — project content is untrusted
//! input, and a prompt injection in a note must not be able to read it.
//!
//! Request-shape notes for the current model family:
//! - `temperature`/`top_p`/`top_k` are rejected (400) — steer with prompting.
//! - `thinking.budget_tokens` is removed; thinking is adaptive and on by
//!   default, and `max_tokens` caps thinking *plus* response text.
//! - A refusal arrives as HTTP 200 with `stop_reason: "refusal"`, so
//!   `stop_reason` is checked before reading `content`.

use std::time::Duration;

use serde::{Deserialize, Serialize};

use super::secrets;
use super::AgentError;

const API_URL: &str = "https://api.anthropic.com/v1/messages";
const API_VERSION: &str = "2023-06-01";
pub const DEFAULT_MODEL: &str = "claude-opus-5";
/// Non-streaming ceiling that stays under the HTTP timeout while leaving
/// room for adaptive thinking, which bills against the same budget.
const DEFAULT_MAX_TOKENS: u32 = 16_000;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatMessage {
    pub role: String,
    pub content: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct CompletionRequest {
    pub model: Option<String>,
    pub system: Option<String>,
    pub messages: Vec<ChatMessage>,
    pub max_tokens: Option<u32>,
    /// `low` | `medium` | `high` | `xhigh` | `max`.
    pub effort: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct CompletionResponse {
    pub text: String,
    pub model: String,
    pub stop_reason: Option<String>,
    pub input_tokens: u32,
    pub output_tokens: u32,
}

// --- wire types -----------------------------------------------------------

#[derive(Serialize)]
struct WireRequest<'a> {
    model: &'a str,
    max_tokens: u32,
    messages: Vec<WireMessage<'a>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    system: Option<&'a str>,
    #[serde(skip_serializing_if = "Option::is_none")]
    output_config: Option<WireOutputConfig<'a>>,
}

#[derive(Serialize)]
struct WireMessage<'a> {
    role: &'a str,
    content: &'a str,
}

#[derive(Serialize)]
struct WireOutputConfig<'a> {
    effort: &'a str,
}

#[derive(Deserialize)]
struct WireResponse {
    model: String,
    #[serde(default)]
    content: Vec<WireBlock>,
    stop_reason: Option<String>,
    #[serde(default)]
    stop_details: Option<WireStopDetails>,
    usage: WireUsage,
}

#[derive(Deserialize)]
struct WireBlock {
    #[serde(rename = "type")]
    kind: String,
    #[serde(default)]
    text: Option<String>,
}

#[derive(Deserialize)]
struct WireStopDetails {
    #[serde(default)]
    category: Option<String>,
}

#[derive(Deserialize, Default)]
struct WireUsage {
    #[serde(default)]
    input_tokens: u32,
    #[serde(default)]
    output_tokens: u32,
}

#[derive(Deserialize)]
struct WireError {
    error: WireErrorBody,
}

#[derive(Deserialize)]
struct WireErrorBody {
    message: String,
}

// --- adapter --------------------------------------------------------------

/// Borrow a single secret as a slice for the redactor.
fn slice(key: &String) -> &[String] {
    std::slice::from_ref(key)
}

/// Send a completion request. Blocking by design: it is invoked from a Tauri
/// command already running off the UI thread.
pub fn complete(request: &CompletionRequest) -> Result<CompletionResponse, AgentError> {
    let key = secrets::get_key("anthropic")?;
    let model = request.model.as_deref().unwrap_or(DEFAULT_MODEL);
    let max_tokens = request.max_tokens.unwrap_or(DEFAULT_MAX_TOKENS);

    let messages: Vec<WireMessage<'_>> = request
        .messages
        .iter()
        .map(|m| WireMessage {
            role: m.role.as_str(),
            content: m.content.as_str(),
        })
        .collect();

    let body = WireRequest {
        model,
        max_tokens,
        messages,
        system: request.system.as_deref(),
        output_config: request
            .effort
            .as_deref()
            .map(|effort| WireOutputConfig { effort }),
    };

    let client = reqwest::blocking::Client::builder()
        .timeout(Duration::from_secs(600))
        .build()
        .map_err(|e| AgentError::Request(e.to_string()))?;

    let response = client
        .post(API_URL)
        .header("x-api-key", &key)
        .header("anthropic-version", API_VERSION)
        .header("content-type", "application/json")
        .json(&body)
        .send()
        .map_err(|e| AgentError::Request(secrets::redact(&e.to_string(), slice(&key))))?;

    let status = response.status();
    let text = response
        .text()
        .map_err(|e| AgentError::Request(secrets::redact(&e.to_string(), slice(&key))))?;

    if !status.is_success() {
        let message = serde_json::from_str::<WireError>(&text)
            .map(|e| e.error.message)
            .unwrap_or_else(|_| text.clone());
        return Err(AgentError::Api {
            status: status.as_u16(),
            message: secrets::redact(&message, &[key]),
        });
    }

    parse_success(&text)
}

/// Split out from the network call so the response contract is testable.
fn parse_success(body: &str) -> Result<CompletionResponse, AgentError> {
    let parsed: WireResponse =
        serde_json::from_str(body).map_err(|e| AgentError::Request(e.to_string()))?;

    // Check stop_reason before reading content: a refusal is a 200 whose
    // content is empty (pre-output) or partial (mid-stream).
    if parsed.stop_reason.as_deref() == Some("refusal") {
        let category = parsed
            .stop_details
            .and_then(|d| d.category)
            .unwrap_or_else(|| "unspecified".to_string());
        return Err(AgentError::Refusal { category });
    }

    let text = parsed
        .content
        .iter()
        .filter(|b| b.kind == "text")
        .filter_map(|b| b.text.as_deref())
        .collect::<Vec<_>>()
        .join("");

    Ok(CompletionResponse {
        text,
        model: parsed.model,
        stop_reason: parsed.stop_reason,
        input_tokens: parsed.usage.input_tokens,
        output_tokens: parsed.usage.output_tokens,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_a_normal_response() {
        let body = r#"{
            "model": "claude-opus-5",
            "content": [{"type": "text", "text": "Hello"}],
            "stop_reason": "end_turn",
            "usage": {"input_tokens": 12, "output_tokens": 3}
        }"#;
        let parsed = parse_success(body).unwrap();
        assert_eq!(parsed.text, "Hello");
        assert_eq!(parsed.input_tokens, 12);
        assert_eq!(parsed.stop_reason.as_deref(), Some("end_turn"));
    }

    #[test]
    fn concatenates_multiple_text_blocks_and_skips_thinking() {
        let body = r#"{
            "model": "claude-opus-5",
            "content": [
                {"type": "thinking", "thinking": ""},
                {"type": "text", "text": "part one "},
                {"type": "text", "text": "part two"}
            ],
            "stop_reason": "end_turn",
            "usage": {"input_tokens": 1, "output_tokens": 2}
        }"#;
        assert_eq!(parse_success(body).unwrap().text, "part one part two");
    }

    #[test]
    fn a_refusal_is_an_error_not_empty_text() {
        let body = r#"{
            "model": "claude-opus-5",
            "content": [],
            "stop_reason": "refusal",
            "stop_details": {"type": "refusal", "category": "cyber"},
            "usage": {"input_tokens": 5, "output_tokens": 0}
        }"#;
        match parse_success(body) {
            Err(AgentError::Refusal { category }) => assert_eq!(category, "cyber"),
            other => panic!("expected refusal, got {other:?}"),
        }
    }

    #[test]
    fn a_refusal_without_details_still_reports_cleanly() {
        let body = r#"{
            "model": "claude-opus-5",
            "content": [],
            "stop_reason": "refusal",
            "usage": {"input_tokens": 5, "output_tokens": 0}
        }"#;
        match parse_success(body) {
            Err(AgentError::Refusal { category }) => assert_eq!(category, "unspecified"),
            other => panic!("expected refusal, got {other:?}"),
        }
    }

    #[test]
    fn max_tokens_stop_is_surfaced_rather_than_hidden() {
        let body = r#"{
            "model": "claude-opus-5",
            "content": [{"type": "text", "text": "truncated"}],
            "stop_reason": "max_tokens",
            "usage": {"input_tokens": 1, "output_tokens": 16000}
        }"#;
        let parsed = parse_success(body).unwrap();
        assert_eq!(parsed.stop_reason.as_deref(), Some("max_tokens"));
    }

    #[test]
    fn malformed_json_is_an_error() {
        assert!(parse_success("{ not json").is_err());
    }

    #[test]
    fn request_omits_sampling_parameters_entirely() {
        // temperature/top_p/top_k are rejected by the current model family;
        // the serialized body must never contain them.
        let body = WireRequest {
            model: "claude-opus-5",
            max_tokens: 16_000,
            messages: vec![WireMessage {
                role: "user",
                content: "hi",
            }],
            system: None,
            output_config: None,
        };
        let json = serde_json::to_string(&body).unwrap();
        for banned in ["temperature", "top_p", "top_k", "budget_tokens"] {
            assert!(!json.contains(banned), "request must not send {banned}");
        }
        assert!(!json.contains("system"), "None system must be omitted");
    }

    #[test]
    fn effort_is_nested_under_output_config() {
        let body = WireRequest {
            model: "claude-opus-5",
            max_tokens: 16_000,
            messages: vec![],
            system: Some("be brief"),
            output_config: Some(WireOutputConfig { effort: "high" }),
        };
        let json = serde_json::to_string(&body).unwrap();
        assert!(json.contains(r#""output_config":{"effort":"high"}"#));
    }
}
