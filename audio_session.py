from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, Optional


@dataclass
class SessionAudio:
    card_id: int
    recording_b64: Optional[str] = None
    recording_mime: str = "audio/webm"
    target_audio_url: Optional[str] = None
    target_speed: float = 1.0
    score: Optional[int] = None


@dataclass
class AudioSessionStore:
    sessions: Dict[int, SessionAudio] = field(default_factory=dict)

    def ensure(self, card_id: int) -> SessionAudio:
        if card_id not in self.sessions:
            self.sessions[card_id] = SessionAudio(card_id=card_id)
        return self.sessions[card_id]

    def save_recording(self, card_id: int, recording_b64: str, mime: str) -> SessionAudio:
        session = self.ensure(card_id)
        session.recording_b64 = recording_b64
        session.recording_mime = mime or "audio/webm"
        return session

    def set_target_audio(self, card_id: int, url: str) -> SessionAudio:
        session = self.ensure(card_id)
        session.target_audio_url = url
        return session

    def set_score(self, card_id: int, score: int) -> SessionAudio:
        session = self.ensure(card_id)
        session.score = score
        return session

    def clear(self, card_id: int) -> None:
        if card_id in self.sessions:
            del self.sessions[card_id]
