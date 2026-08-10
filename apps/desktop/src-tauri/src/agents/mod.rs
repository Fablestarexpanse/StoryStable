//! Agent system: model gateway, provider adapters, credentials.
//!
//! Spec §8.1 / PRODUCT_SPEC §10.2: an agent is not bound to a model. Requests
//! flow Agent → capability request → routing policy → provider/model, and
//! cloud providers are never reached silently when policy forbids it.

pub mod anthropic;
pub mod gateway;
pub mod local;
pub mod openrouter;
pub mod secrets;

use serde::{Deserialize, Serialize};

/// One turn in a conversation. Shared by every provider adapter.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatMessage {
    pub role: String,
    pub content: String,
}

/// Provider-neutral completion request. Adapters translate it into their own
/// wire shape; nothing provider-specific leaks into this contract.
#[derive(Debug, Clone, Deserialize)]
pub struct CompletionRequest {
    /// Provider the caller selected. Local model ids look like first-party
    /// ones, so this cannot be inferred reliably and is passed explicitly.
    pub provider: Option<String>,
    pub model: Option<String>,
    pub system: Option<String>,
    pub messages: Vec<ChatMessage>,
    pub max_tokens: Option<u32>,
    /// Depth hint where the provider supports one.
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

#[derive(Debug, thiserror::Error)]
pub enum AgentError {
    #[error("no credential configured for provider \"{0}\"")]
    MissingCredential(String),
    #[error("secret storage error: {0}")]
    Secret(String),
    #[error("routing policy \"{policy}\" forbids the cloud provider \"{provider}\"")]
    PolicyForbidsCloud { policy: String, provider: String },
    #[error("unknown provider \"{0}\"")]
    UnknownProvider(String),
    #[error("provider request failed: {0}")]
    Request(String),
    #[error("provider returned {status}: {message}")]
    Api { status: u16, message: String },
    #[error("the model declined this request ({category})")]
    Refusal { category: String },
}

impl Serialize for AgentError {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        serializer.serialize_str(&self.to_string())
    }
}
