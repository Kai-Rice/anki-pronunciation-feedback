from __future__ import annotations

from pathlib import Path

from .tts_local import LocalTtsProvider


class ApiTtsProvider:
    name = "api"

    def synthesize(self, text: str, language: str, voice: str, cache_dir: Path) -> Path:
        """
        MVP API provider placeholder.

        In the MVP scaffold this reuses local placeholder generation so the
        integration flow works without external credentials.
        """
        return LocalTtsProvider().synthesize(text=text, language=language, voice=voice, cache_dir=cache_dir)
