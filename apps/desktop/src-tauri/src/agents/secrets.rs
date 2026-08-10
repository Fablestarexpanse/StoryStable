//! Provider credentials.
//!
//! Spec §12.2: API keys live in OS-backed secure storage — never in project
//! files, logs, generation packets, or crash reports. The key is also never
//! returned to the webview: the frontend can set, check, and clear a
//! credential, but only Rust ever reads its value. That keeps a prompt
//! injection inside project content from being able to exfiltrate it.

use keyring::Entry;
use serde::Serialize;

use super::AgentError;

const SERVICE: &str = "storystable";

fn entry(provider: &str) -> Result<Entry, AgentError> {
    Entry::new(SERVICE, provider).map_err(|e| AgentError::Secret(e.to_string()))
}

/// Store (or replace) a provider's API key.
pub fn set_key(provider: &str, key: &str) -> Result<(), AgentError> {
    if key.trim().is_empty() {
        return Err(AgentError::Secret("key is empty".into()));
    }
    entry(provider)?
        .set_password(key.trim())
        .map_err(|e| AgentError::Secret(e.to_string()))
}

/// Read a key for outbound requests. Never exposed through a Tauri command.
pub fn get_key(provider: &str) -> Result<String, AgentError> {
    entry(provider)?
        .get_password()
        .map_err(|_| AgentError::MissingCredential(provider.to_string()))
}

pub fn delete_key(provider: &str) -> Result<(), AgentError> {
    match entry(provider)?.delete_credential() {
        Ok(()) => Ok(()),
        // Deleting an absent credential is not an error — the desired end
        // state (no stored key) already holds.
        Err(keyring::Error::NoEntry) => Ok(()),
        Err(e) => Err(AgentError::Secret(e.to_string())),
    }
}

#[derive(Debug, Serialize)]
pub struct CredentialStatus {
    pub provider: String,
    pub configured: bool,
    /// Last 4 characters only, for confirming *which* key is stored.
    pub hint: Option<String>,
}

pub fn status(provider: &str) -> CredentialStatus {
    match get_key(provider) {
        Ok(key) => CredentialStatus {
            provider: provider.to_string(),
            configured: true,
            hint: Some(hint(&key)),
        },
        Err(_) => CredentialStatus {
            provider: provider.to_string(),
            configured: false,
            hint: None,
        },
    }
}

/// A non-reversible display hint. Short keys reveal nothing at all.
fn hint(key: &str) -> String {
    let chars: Vec<char> = key.chars().collect();
    if chars.len() <= 8 {
        return "•".repeat(chars.len().min(8));
    }
    format!("…{}", chars[chars.len() - 4..].iter().collect::<String>())
}

/// Replace any stored credential appearing in text with a redaction marker.
/// Applied to provider errors before they reach logs or the UI (spec §12.2).
pub fn redact(text: &str, secrets: &[String]) -> String {
    let mut out = text.to_string();
    for secret in secrets {
        if secret.len() >= 8 {
            out = out.replace(secret.as_str(), "[REDACTED]");
        }
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn hint_shows_only_the_last_four_characters() {
        assert_eq!(hint("sk-ant-api03-ABCDEFGH1234"), "…1234");
    }

    #[test]
    fn hint_never_leaks_a_short_key() {
        let h = hint("short");
        assert_eq!(h, "•••••");
        assert!(!h.contains("short"));
    }

    #[test]
    fn redact_removes_secrets_from_text() {
        let secret = "sk-ant-api03-SUPERSECRET".to_string();
        let text = format!("request failed with key {secret} attached");
        let cleaned = redact(&text, std::slice::from_ref(&secret));
        assert!(!cleaned.contains(&secret));
        assert!(cleaned.contains("[REDACTED]"));
    }

    #[test]
    fn redact_ignores_short_strings_to_avoid_mangling_output() {
        // A 3-char "secret" would otherwise redact ordinary words.
        assert_eq!(redact("the cat sat", &["cat".to_string()]), "the cat sat");
    }

    #[test]
    fn empty_key_is_rejected() {
        assert!(matches!(
            set_key("test-empty", "   "),
            Err(AgentError::Secret(_))
        ));
    }
}
