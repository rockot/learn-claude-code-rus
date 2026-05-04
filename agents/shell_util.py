"""
Helpers for cross-platform subprocess output decoding.

Windows shell tools may emit OEM/ANSI encodings (cp866/cp1251), while
Unix-like systems are typically UTF-8. This module normalizes output to str.
"""

from __future__ import annotations

import subprocess
from dataclasses import dataclass
from pathlib import Path
from typing import Sequence


@dataclass(frozen=True)
class DecodedRun:
    stdout: str
    stderr: str
    returncode: int


def decode_process_bytes(data: bytes | None) -> str:
    if not data:
        return ""
    for enc in ("utf-8", "utf-8-sig", "cp866", "cp1251", "cp1252", "latin-1"):
        try:
            return data.decode(enc)
        except UnicodeDecodeError:
            continue
    return data.decode("utf-8", errors="replace")


def run_decoded(
    cmd: str | Sequence[str],
    *,
    cwd: str | Path | None = None,
    timeout: float | None = None,
    shell: bool | None = None,
) -> DecodedRun:
    if shell is None:
        shell = isinstance(cmd, str)
    result = subprocess.run(
        cmd,
        shell=shell,
        cwd=cwd,
        capture_output=True,
        text=False,
        timeout=timeout,
    )
    return DecodedRun(
        stdout=decode_process_bytes(result.stdout),
        stderr=decode_process_bytes(result.stderr),
        returncode=result.returncode,
    )
