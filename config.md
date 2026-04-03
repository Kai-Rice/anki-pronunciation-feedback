# Pronunciation Feedback Configuration

## Keys

- `enabled_note_types`: note type names where the widget should appear.
- `target_text_field`: note field used to generate target pronunciation.
- `target_language`: language code for TTS generation.
- `play_target_on_reveal`: autoplay generated target pronunciation on answer reveal.
- `speed_options`: playback speed buttons shown in back-side UI.
- `tts_backend`: preferred TTS route. Supported values:
  - `local_provider`
  - `api`
  - `anki_voice_if_available`
- `tts_voice`: optional provider-specific voice identifier.
- `cache_generated_audio`: if true, generated target audio is cached in `user_files/cache`.
- `show_pronunciation_score`: toggles score UI label.
- `linux_backend_fallback`: fallback backend when preferred backend is unavailable on Linux.

## Linux note

Linux does not provide built-in Anki voices by default. Keep `tts_backend` set to
`local_provider` or `api` for reliable behavior on Linux Mint.
