from __future__ import annotations

from pathlib import Path


class AnkiVoiceTtsProvider:
    name = "anki_voice_if_available"

    def available(self) -> bool:
        return False

    def synthesize(
        self,
        text: str,
        language: str,
        voice: str,
        cache_dir: Path,
        config: dict | None = None,
    ) -> Path:
        raise RuntimeError("Built-in Anki voice backend is not implemented yet.")
