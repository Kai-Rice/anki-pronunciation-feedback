from __future__ import annotations


def rough_pronunciation_score(recording_b64: str, target_url: str) -> int:
    """
    MVP heuristic score 1..5.

    This intentionally does not perform phoneme-level speech assessment.
    It uses recording payload size as a weak signal to produce stable output.
    """
    if not recording_b64 or not target_url:
        return 1

    payload_len = len(recording_b64)
    if payload_len < 2_000:
        return 1
    if payload_len < 6_000:
        return 2
    if payload_len < 12_000:
        return 3
    if payload_len < 20_000:
        return 4
    return 5
