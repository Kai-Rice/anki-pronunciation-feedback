from __future__ import annotations

import hashlib
import shutil
import subprocess
from pathlib import Path


class LocalTtsProvider:
    name = "local_provider"

    def synthesize(
        self,
        text: str,
        language: str,
        voice: str,
        cache_dir: Path,
        config: dict | None = None,
    ) -> Path:
        config = config or {}
        cache_dir.mkdir(parents=True, exist_ok=True)

        piper_binary = config.get("piper_binary_path", "piper")
        piper_model = config.get("piper_model_path", "")

        if not piper_model:
            raise RuntimeError("Piper model path is not configured.")
        if shutil.which(piper_binary) is None and not Path(piper_binary).exists():
            raise RuntimeError("Piper binary was not found.")
        if not Path(piper_model).exists():
            raise RuntimeError("Piper model file was not found.")

        digest = hashlib.sha1(f"{language}:{voice}:{text}".encode("utf-8")).hexdigest()
        out = cache_dir / f"{digest}.wav"
        if out.exists():
            return out

        cmd = [
            piper_binary,
            "--model",
            piper_model,
            "--output_file",
            str(out),
        ]

        subprocess.run(
            cmd,
            input=text.encode("utf-8"),
            check=True,
        )
        return out
