from __future__ import annotations

import hashlib
from pathlib import Path


class LocalTtsProvider:
    name = "local_provider"

    def synthesize(self, text: str, language: str, voice: str, cache_dir: Path) -> Path:
        """
        MVP local provider stub.

        Generates deterministic placeholder bytes to validate end-to-end flow.
        A production version should call a real local Linux-capable TTS engine.
        """
        cache_dir.mkdir(parents=True, exist_ok=True)
        digest = hashlib.sha1(f"{language}:{voice}:{text}".encode("utf-8")).hexdigest()
        out = cache_dir / f"{digest}.mp3"
        if not out.exists():
            out.write_bytes(self._silent_mp3_bytes())
        return out

    def _silent_mp3_bytes(self) -> bytes:
        return b"ID3\x03\x00\x00\x00\x00\x00\x0fTIT2\x00\x00\x00\x05\x00\x00\x00\x00\x00\x00"
