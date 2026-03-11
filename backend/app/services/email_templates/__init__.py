"""Bank email template registry.

Auto-discovers and registers all BankEmailTemplate subclasses.
"""

from __future__ import annotations

from .bancolombia import BancolombiaTemplate
from .base import BankEmailTemplate, TransactionData
from .revolut import RevolutTemplate
from .sumeria import SumeriaTemplate
from .wise import WiseTemplate

# Registry of all available templates
_TEMPLATES: list[BankEmailTemplate] = [
    RevolutTemplate(),
    WiseTemplate(),
    SumeriaTemplate(),
    BancolombiaTemplate(),
]


def detect_and_parse(
    from_addr: str,
    subject: str,
    html_body: str,
    text_body: str,
    date: str,
    message_id: str,
) -> TransactionData | None:
    """Try each registered template and return parsed data from the first match."""
    from datetime import datetime as dt
    from email.utils import parsedate_to_datetime

    if isinstance(date, str):
        try:
            parsed_date = dt.fromisoformat(date)
        except ValueError:
            try:
                parsed_date = parsedate_to_datetime(date)
            except Exception:
                parsed_date = dt.now()
    else:
        parsed_date = date

    for template in _TEMPLATES:
        if template.matches(from_addr, subject):
            result = template.extract(html_body, text_body, subject, parsed_date, message_id)
            if result is not None:
                return result
    return None


__all__ = [
    "BankEmailTemplate",
    "TransactionData",
    "detect_and_parse",
]
