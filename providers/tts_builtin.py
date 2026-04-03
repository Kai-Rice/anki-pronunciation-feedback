from __future__ import annotations

import platform
from pathlib import Path

from .tts_local import LocalTtsProvider


class AnkiVoiceTtsProvider:
    name = "anki_voice_if_available"

    def available(self) -> bool:
        return platform.system().lower() in {"windows", "darwin"}

    def synthesize(self, text: str, language: str, voice: str, cache_dir: Path) -> Path:
        if not self.available():
            raise RuntimeError("Anki built-in voices are typically unavailable on Linux")
        return LocalTtsProvider().synthesize(text=text, language=language, voice=voice, cache_dir=cache_dir)
