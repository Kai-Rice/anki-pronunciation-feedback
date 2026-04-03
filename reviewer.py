from __future__ import annotations

import json
import platform
from pathlib import Path
from typing import Any, Dict, Optional

from aqt import gui_hooks, mw
from aqt.reviewer import Reviewer
from aqt.webview import WebContent

from .audio_session import AudioSessionStore
from .providers import ApiTtsProvider, AnkiVoiceTtsProvider, LocalTtsProvider
from .scoring import rough_pronunciation_score

ADDON_PACKAGE = __name__.split(".")[0]

WIDGET_HTML = """
<div id=\"pf-root\" data-pf-side=\"__SIDE__\">
  <div class=\"pf-wave\" id=\"pf-wave\">No recording yet</div>
  <div class=\"pf-controls\">
    <button id=\"pf-record\" class=\"pf-primary\">Record</button>
    <button id=\"pf-stop\" class=\"pf-primary pf-hidden\">Stop</button>
    <button id=\"pf-play-mine\" class=\"pf-secondary pf-hidden\">Play Mine</button>
    <button id=\"pf-redo\" class=\"pf-secondary pf-hidden\">Redo</button>
  </div>
  <div class=\"pf-back pf-hidden\" id=\"pf-back\">
    <div class=\"pf-target\">
      <button id=\"pf-play-target\" class=\"pf-secondary\">Play Target</button>
      <div id=\"pf-speeds\" class=\"pf-speeds\"></div>
    </div>
    <div class=\"pf-feedback\">
      <button id=\"pf-compare\" class=\"pf-secondary\">Compare</button>
      <span id=\"pf-score\">Pronunciation match: -/5</span>
    </div>
  </div>
</div>
"""


class PronunciationReviewerBridge:
    def __init__(self) -> None:
        self._sessions = AudioSessionStore()
        self._exports_ready = False

    def setup(self) -> None:
        mw.addonManager.setWebExports(ADDON_PACKAGE, r"web/.*")
        gui_hooks.webview_will_set_content.append(self._on_webview_will_set_content)
        gui_hooks.card_will_show.append(self._on_card_will_show)
        gui_hooks.webview_did_receive_js_message.append(self._on_js_message)

    def _on_webview_will_set_content(self, web_content: WebContent, context: Any) -> None:
        if not isinstance(context, Reviewer):
            return
        if self._exports_ready:
            return
        addon_path = f"/_addons/{ADDON_PACKAGE}/web"
        web_content.css.append(f"{addon_path}/pronunciation.css")
        web_content.js.append(f"{addon_path}/pronunciation.js")
        self._exports_ready = True

    def _on_card_will_show(self, html: str, card: Any, context: str) -> str:
        if context not in {"reviewQuestion", "reviewAnswer"}:
            return html

        note = card.note()
        cfg = self._cfg()
        if note.note_type()["name"] not in cfg.get("enabled_note_types", []):
            return html

        side = "front" if context == "reviewQuestion" else "back"
        payload = {
            "side": side,
            "cardId": card.id,
            "speedOptions": cfg.get("speed_options", [0.7, 0.85, 1.0]),
            "showScore": bool(cfg.get("show_pronunciation_score", True)),
            "playTargetOnReveal": bool(cfg.get("play_target_on_reveal", True)),
        }
        widget = WIDGET_HTML.replace("__SIDE__", side)
        state_script = (
            "<script>window.__PF_STATE__ = "
            + json.dumps(payload)
            + ";</script>"
        )
        return html + widget + state_script

    def _on_js_message(self, handled: tuple[bool, Optional[Any]], message: str, context: Any) -> tuple[bool, Optional[Any]]:
        if not message.startswith("pf:"):
            return handled

        _, raw = message.split(":", 1)
        payload = json.loads(raw)
        action = payload.get("action")
        card_id = int(payload.get("cardId", 0))

        if action == "saveRecording":
            self._save_recording(card_id, payload)
        elif action == "redoRecording":
            self._sessions.clear(card_id)
        elif action == "loadBackState":
            self._load_back_state(card_id)
        elif action == "compare":
            self._compare(card_id)
        elif action == "playTarget":
            self._emit_target_url(card_id)

        return (True, None)

    def _cfg(self) -> Dict[str, Any]:
        cfg = mw.addonManager.getConfig(ADDON_PACKAGE)
        return cfg or {}

    def _save_recording(self, card_id: int, payload: Dict[str, Any]) -> None:
        recording = payload.get("recordingB64", "")
        mime = payload.get("mime", "audio/webm")
        self._sessions.save_recording(card_id=card_id, recording_b64=recording, mime=mime)

    def _load_back_state(self, card_id: int) -> None:
        card = mw.reviewer.card
        if not card or card.id != card_id:
            return

        session = self._sessions.ensure(card_id)
        target_url = self._ensure_target_audio(card)
        if target_url:
            session.target_audio_url = target_url
            self._send_to_web(
                {
                    "type": "backState",
                    "recordingB64": session.recording_b64,
                    "recordingMime": session.recording_mime,
                    "targetUrl": target_url,
                }
            )

    def _compare(self, card_id: int) -> None:
        session = self._sessions.ensure(card_id)
        score = rough_pronunciation_score(
            recording_b64=session.recording_b64 or "",
            target_url=session.target_audio_url or "",
        )
        self._sessions.set_score(card_id, score)
        self._send_to_web({"type": "score", "score": score})

    def _emit_target_url(self, card_id: int) -> None:
        session = self._sessions.ensure(card_id)
        if session.target_audio_url:
            self._send_to_web({"type": "targetUrl", "url": session.target_audio_url})

    def _ensure_target_audio(self, card: Any) -> Optional[str]:
        cfg = self._cfg()
        note = card.note()
        field = cfg.get("target_text_field", "TargetWord")
        text = note[field] if field in note else ""
        if not text.strip():
            return None

        backend = cfg.get("tts_backend", "local_provider")
        fallback = cfg.get("linux_backend_fallback", "api")
        provider = self._pick_provider(backend, fallback)

        cache_dir = Path(mw.pm.addonFolder()) / ADDON_PACKAGE / "user_files" / "cache"
        out = provider.synthesize(
            text=text,
            language=cfg.get("target_language", "ko_KR"),
            voice=cfg.get("tts_voice", ""),
            cache_dir=cache_dir,
        )
        return f"file://{out}"

    def _pick_provider(self, backend: str, fallback: str):
        providers = {
            "local_provider": LocalTtsProvider(),
            "api": ApiTtsProvider(),
            "anki_voice_if_available": AnkiVoiceTtsProvider(),
        }
        selected = providers.get(backend, LocalTtsProvider())
        if backend == "anki_voice_if_available" and platform.system().lower() == "linux":
            return providers.get(fallback, ApiTtsProvider())
        return selected

    def _send_to_web(self, payload: Dict[str, Any]) -> None:
        mw.reviewer.web.eval(f"window.PF && window.PF.onPythonMessage({json.dumps(payload)});")


bridge = PronunciationReviewerBridge()
