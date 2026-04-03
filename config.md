# Pronunciation Feedback Configuration

## Keys

- `note_type_rules`: list of per-note-type rules with:
  - `note_type`
  - `target_text_field`
  - `target_language`
- `play_target_on_reveal`: autoplay generated target pronunciation on answer reveal.
- `mine_speed_options`: playback speed buttons for learner recording.
- `target_speed_options`: playback speed buttons for target audio.
- `tts_backend`: preferred TTS route. Supported values:
  - `local_provider`
  - `api` (currently unimplemented; raises an error)
  - `anki_voice_if_available` (currently unimplemented; raises an error)
- `local_tts_engine`: local engine selector (currently Piper).
- `piper_binary_path`: Piper executable path.
- `piper_model_path`: Piper model path.
- `piper_speaker`: optional Piper speaker value.
- `api_provider`: reserved for future API backend.
- `api_key`: reserved for future API backend.
- `tts_voice`: optional provider-specific voice identifier.
- `cache_generated_audio`: if true, generated target audio is cached in `user_files/cache`.
- `show_pronunciation_score`: toggles score UI label (default false until real scoring is added).
- `linux_backend_fallback`: fallback backend when preferred backend is unavailable on Linux.

## Linux note

Linux Mint is supported with Piper via `local_provider`.
