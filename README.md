# Pronunciation Feedback for Anki

Pronunciation Feedback for Anki is an Anki add-on that adds a lightweight speaking workflow to normal card review:

- Front side: record, stop, replay, redo.
- Back side: replay learner audio, play target pronunciation generated from a configured field, compare playback, and show a rough `1..5` match score.
- Anki grading flow (Again/Hard/Good/Easy) remains unchanged.

## Implemented MVP Scaffold

This repository now contains a complete MVP scaffold with:

- Hook-based reviewer integration (`card_will_show`, webview JS bridge).
- Independent front/back widget initialization.
- Front recording controls and persisted in-memory session state.
- Back-side target generation via pluggable TTS backends.
- Linux-first backend semantics with explicit fallback when built-in voices are unavailable.

## Add-on Layout

```text
.
├── __init__.py
├── reviewer.py
├── audio_session.py
├── scoring.py
├── providers/
│   ├── __init__.py
│   ├── tts_builtin.py
│   ├── tts_local.py
│   └── tts_api.py
├── web/
│   ├── pronunciation.css
│   └── pronunciation.js
├── config.json
├── config.md
└── user_files/
    └── README.txt
```

## Configuration

See `config.json` for defaults and `config.md` for definitions.

Key points:

- `tts_backend` supports:
  - `local_provider`
  - `api`
  - `anki_voice_if_available`
- `linux_backend_fallback` is used when the selected backend is unavailable on Linux.

## Installation (local dev)

1. In Anki, open **Tools → Add-ons → View Files** for your add-ons directory.
2. Copy this project folder into `addons21` as `pronunciation_feedback`.
3. Restart Anki.
4. Configure fields and backend from add-on config.

## Notes on Current MVP Implementation

- TTS providers are currently scaffolded with deterministic placeholder audio output to validate integration and UX flow.
- The pronunciation score is intentionally rough and informational only.
- The reviewer widget is appended via hooks and communicates JS→Python via `pycmd()` messages prefixed with `pf:`.

## Linux Support

Linux Mint is treated as a first-class target.

- Do not rely on built-in OS voices.
- Use `local_provider` or `api` for reliable Linux behavior.
- If `anki_voice_if_available` is selected on Linux, the configured fallback backend is used.
