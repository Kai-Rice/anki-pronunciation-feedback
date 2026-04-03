from __future__ import annotations

from pathlib import Path


class ApiTtsProvider:
    name = "api"

    def synthesize(
        self,
        text: str,
        language: str,
        voice: str,
        cache_dir: Path,
        config: dict | None = None,
    ) -> Path:
        raise RuntimeError("API TTS is not implemented yet. Use local_provider.")
