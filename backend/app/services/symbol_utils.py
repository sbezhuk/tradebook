import re
from typing import Tuple, Optional

PAIR_REGEX = re.compile(
    r"^[A-Z0-9_!.-]{1,15}\/[A-Z0-9_!.-]{2,10}(\s*\([A-Z0-9_\- ]+\))?$",
    re.IGNORECASE,
)

SUFFIX_REGEX = re.compile(r"^(.*?)\s*(\([A-Za-z0-9_\- ]+\))\s*$")


def parse_symbol_parts(raw: str) -> Tuple[str, Optional[str], Optional[str]]:
    """
    Extract (base, quote, suffix) from a symbol string.
    Examples:
        'BTC/USDT' -> ('BTC', 'USDT', None)
        'NVDA/USDT (IO)' -> ('NVDA', 'USDT', '(IO)')
        'NVDA (IO)' -> ('NVDA', None, '(IO)')
        'BTC' -> ('BTC', None, None)
    """
    s = (raw or "").strip()
    if not s:
        return "", None, None

    suffix = None
    match = SUFFIX_REGEX.match(s)
    if match:
        main_part = match.group(1).strip()
        suffix = match.group(2).strip().upper()
    else:
        main_part = s

    if "/" in main_part:
        parts = main_part.split("/", 1)
        base = parts[0].strip().upper()
        quote = parts[1].strip().upper()
        return base, quote, suffix

    if "-" in main_part or "_" in main_part:
        parts = re.split(r"[-_]", main_part, 1)
        base = parts[0].strip().upper()
        quote = parts[1].strip().upper()
        return base, quote, suffix

    up = main_part.upper()
    if up.endswith("USDT") and len(up) > 4:
        return up[:-4].strip().upper(), "USDT", suffix
    if up.endswith("USDC") and len(up) > 4:
        return up[:-4].strip().upper(), "USDC", suffix

    return main_part.strip().upper(), None, suffix


def normalize_symbol_pair(raw: str, default_quote: str = "USDT") -> str:
    """
    Ensure the symbol is formatted as a proper trading pair (BASE/QUOTE or BASE/QUOTE (SUFFIX)).
    If only a base asset or base + suffix is provided (e.g. 'BTC' or 'NVDA (IO)'),
    it attaches the default quote currency (e.g. 'BTC/USDT' or 'NVDA/USDT (IO)').
    Existing valid pairs ('BTC/USDC', 'EUR/USD') are preserved.
    """
    s = (raw or "").strip()
    if not s:
        return ""

    base, quote, suffix = parse_symbol_parts(s)
    target_quote = (quote or default_quote).upper()

    suffix_str = f" {suffix}" if suffix else ""
    return f"{base}/{target_quote}{suffix_str}"


def is_valid_pair(raw: str) -> bool:
    """Check if the symbol matches a valid pair format BASE/QUOTE [ (SUFFIX)]."""
    s = (raw or "").strip()
    if not s:
        return False
    return bool(PAIR_REGEX.match(s))
