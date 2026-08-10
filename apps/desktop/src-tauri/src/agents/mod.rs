//! Agent system: model gateway, provider adapters, credentials.
//!
//! Spec §8.1 / PRODUCT_SPEC §10.2: an agent is not bound to a model. Requests
//! flow Agent → capability request → routing policy → provider/model, and
//! cloud providers are never reached silently when policy forbids it.

pub mod anthropic;
pub mod gateway;
pub mod secrets;

use serde::Serialize;

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
