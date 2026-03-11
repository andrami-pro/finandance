"""Wise (TransferWise) email notification parser.

Wise sends notifications with subjects like:
- "You sent 100.00 EUR to John Doe"
- "John Doe sent you 50.00 GBP"
- "Your transfer to John Doe is complete"
- "You've received 200.00 USD"

NOTE: These patterns are initial guesses. Iterate with real .eml files
from your Wise account to refine the regex patterns.
"""

from __future__ import annotations

import re
from datetime import datetime
from decimal import Decimal, InvalidOperation

from .base import BankEmailTemplate, TransactionData

_WISE_SENDERS = [
    "no-reply@wise.com",
    "noreply@wise.com",
    "notifications@wise.com",
    "no-reply@transferwise.com",
]

_OUTGOING_SUBJECTS = [
    r"you sent",
    r"your transfer to",
    r"transfer .+ is complete",
    r"you paid",
]
_INCOMING_SUBJECTS = [
    r"sent you",
    r"you.ve received",
    r"you received",
    r"incoming payment",
]


class WiseTemplate(BankEmailTemplate):
    @property
    def bank_name(self) -> str:
        return "Wise"

    def matches(self, from_addr: str, subject: str) -> bool:
        return any(sender in from_addr.lower() for sender in _WISE_SENDERS)

    def extract(
        self,
        html_body: str,
        text_body: str,
        subject: str,
        date: datetime,
        message_id: str,
    ) -> TransactionData | None:
        body = text_body or html_body
        if not body:
            return None

        subject_lower = subject.lower()
        direction = "OUT"
        if any(re.search(p, subject_lower) for p in _INCOMING_SUBJECTS):
            direction = "IN"

        # Wise subjects often contain the amount directly
        amount, currency = self._extract_amount(subject)
        if amount is None:
            amount, currency = self._extract_amount(body)
        if amount is None:
            return None

        merchant = self._extract_counterparty(subject)

        return TransactionData(
            amount=amount,
            currency=currency or "EUR",
            merchant=merchant,
            date=date,
            direction=direction,
            raw_description=subject,
            bank_name=self.bank_name,
            message_id=message_id,
        )

    def _extract_amount(self, text: str) -> tuple[Decimal | None, str | None]:
        """Extract amount and currency. Wise typically uses '100.00 EUR' format."""
        # Pattern: 100.00 EUR or 1,234.56 GBP
        match = re.search(
            r"(\d{1,3}(?:,\d{3})*(?:\.\d{2}))\s*(EUR|USD|GBP|COP|RON|PLN|CHF|SEK|NOK|DKK|CZK|HUF)",
            text,
        )
        if match:
            try:
                raw = match.group(1).replace(",", "")
                return Decimal(raw), match.group(2)
            except InvalidOperation:
                pass

        # Symbol pattern: €100.00
        match = re.search(r"([€$£])\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2}))", text)
        if match:
            symbol_map = {"€": "EUR", "$": "USD", "£": "GBP"}
            try:
                raw = match.group(2).replace(",", "")
                return Decimal(raw), symbol_map.get(match.group(1))
            except InvalidOperation:
                pass

        return None, None

    def _extract_counterparty(self, subject: str) -> str:
        """Extract recipient/sender name from subject."""
        for pattern in [
            r"you sent .+ to (.+)",
            r"your transfer to (.+?)(?:\s+is|\s*$)",
            r"(.+?) sent you",
            r"you.ve received .+ from (.+)",
        ]:
            match = re.search(pattern, subject, re.IGNORECASE)
            if match:
                return match.group(1).strip()
        return subject.strip()
