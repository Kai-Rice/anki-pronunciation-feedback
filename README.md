# Pronunciation Feedback for Anki

Pronunciation Feedback for Anki is an add-on that adds a speaking workflow to card review:

- Front side: record, stop, replay, redo.
- Back side: replay learner audio, play target pronunciation generated from configured note rules, and compare playback.
- Anki grading flow (Again/Hard/Good/Easy) remains unchanged.

## Current Behavior

- Linux Mint is supported.
- Local backend uses Piper (`local_provider`).
- API backend is not implemented yet and fails with a clear error.
- Built-in Anki voice backend is not implemented yet and fails with a clear error.
- Pronunciation scoring is currently disabled by default until a real scorer is implemented.

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

## Linux setup (Piper)

1. Install Piper.
2. Download a Korean Piper model.
3. Set `piper_binary_path` and `piper_model_path` in add-on config.
4. Keep `tts_backend` as `local_provider`.

## Installation (local dev)

1. In Anki, open **Tools → Add-ons → View Files** for your add-ons directory.
2. Copy this project folder into `addons21` as `pronunciation_feedback`.
3. Restart Anki.
4. Configure note rules and backend in add-on config.
