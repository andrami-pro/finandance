"""Revolut email notification parser.

Real Revolut email patterns (from actual samples, UI in Spanish):
- Sender: Revolut <no-reply@revolut.com>
- Subject patterns:
  - "Enviaste CHF 200 a Mt Pelerin Group SA 💸"
  - "Enviaste EUR 247,68 a SAMY BEN LETAIEF 💸"
  - "Tu pedido de Shotgun 🛍️"
  - "Payment to Merchant" (English UI)
  - "You received €50.00 from John" (English UI)

Supports both Spanish and English UI languages.
"""

from __future__ import annotations

import re
from datetime import datetime
from decimal import Decimal, InvalidOperation

from .base import BankEmailTemplate, TransactionData

_REVOLUT_SENDERS = [
    "no-reply@revolut.com",
    "noreply@revolut.com",
    "notifications@revolut.com",
]

# Spanish patterns
_ES_SENT_PATTERN = re.compile(r"Enviaste\s+([A-Z]{3})\s+([\d.,]+)\s+a\s+(.+?)(?:\s*💸\s*)?$")
_ES_ORDER_PATTERN = re.compile(r"Tu pedido de\s+(.+?)(?:\s*🛍️?\s*)?$")
_ES_RECEIVED_PATTERN = re.compile(r"Recibiste\s+([A-Z]{3})\s+([\d.,]+)\s+de\s+(.+?)(?:\s*💰\s*)?$")

# English patterns
_EN_SENT_PATTERNS = [
    re.compile(r"(?:Payment|Card payment) to (.+)", re.IGNORECASE),
    re.compile(r"Money sent to (.+)", re.IGNORECASE),
    re.compile(r"You sent (.+)", re.IGNORECASE),
]
_EN_RECEIVED_PATTERNS = [
    re.compile(r"You received .+ from (.+)", re.IGNORECASE),
    re.compile(r"(.+) sent you", re.IGNORECASE),
]

_CURRENCY_SYMBOLS = {"€": "EUR", "$": "USD", "£": "GBP"}

# Amount patterns for body/subject fallback
_CURRENCIES = r"EUR|USD|GBP|COP|RON|PLN|CHF|SEK|NOK|DKK|CZK|HUF|BGN|HRK"
_AMOUNT_PATTERNS = [
    # €50.00 or €50,00 or $123.45 or £99.99
    re.compile(r"([€$£])\s*(\d{1,3}(?:[.,]\d{3})*[.,]\d{2})"),
    # 50.00 EUR or 123,45 USD or 16,43 EUR (with decimal comma or dot)
    re.compile(rf"(\d{{1,3}}(?:[.,]\d{{3}})*[.,]\d{{2}})\s*({_CURRENCIES})"),
    # EUR 16,43 or CHF 200 (currency before amount, with or without decimals)
    re.compile(rf"({_CURRENCIES})\s+(\d{{1,3}}(?:[.,]\d{{3}})*(?:[.,]\d{{2}})?)\b"),
]


class RevolutTemplate(BankEmailTemplate):
    @property
    def bank_name(self) -> str:
        return "Revolut"

    def matches(self, from_addr: str, subject: str) -> bool:
        return any(sender in from_addr.lower() for sender in _REVOLUT_SENDERS)

    def extract(
        self,
        html_body: str,
        text_body: str,
        subject: str,
        date: datetime,
        message_id: str,
    ) -> TransactionData | None:
        # Try Spanish "Enviaste" pattern
        match = _ES_SENT_PATTERN.match(subject.strip())
        if match:
            currency, raw_amount, merchant = match.groups()
            amount = self._parse_amount(raw_amount)
            if amount is not None:
                return TransactionData(
                    amount=amount,
                    currency=currency,
                    merchant=merchant.strip(),
                    date=date,
                    direction="OUT",
                    raw_description=subject,
                    bank_name=self.bank_name,
                    message_id=message_id,
                )

        # Try Spanish "Recibiste" pattern
        match = _ES_RECEIVED_PATTERN.match(subject.strip())
        if match:
            currency, raw_amount, merchant = match.groups()
            amount = self._parse_amount(raw_amount)
            if amount is not None:
                return TransactionData(
                    amount=amount,
                    currency=currency,
                    merchant=merchant.strip(),
                    date=date,
                    direction="IN",
                    raw_description=subject,
                    bank_name=self.bank_name,
                    message_id=message_id,
                )

        # Try Spanish "Tu pedido de" pattern (need amount from body)
        match = _ES_ORDER_PATTERN.match(subject.strip())
        if match:
            merchant = match.group(1).strip()
            body = text_body or html_body
            amount, currency = self._extract_amount_from_text(body) if body else (None, None)
            if amount is not None:
                return TransactionData(
                    amount=amount,
                    currency=currency or "EUR",
                    merchant=merchant,
                    date=date,
                    direction="OUT",
                    raw_description=subject,
                    bank_name=self.bank_name,
                    message_id=message_id,
                )

        # Try English patterns
        return self._try_english_patterns(subject, html_body, text_body, date, message_id)

    def _try_english_patterns(
        self,
        subject: str,
        html_body: str,
        text_body: str,
        date: datetime,
        message_id: str,
    ) -> TransactionData | None:
        body = text_body or html_body
        if not body:
            return None

        # Check direction and extract merchant from English subjects
        direction = "OUT"
        merchant = subject.strip()

        for pattern in _EN_RECEIVED_PATTERNS:
            match = pattern.search(subject)
            if match:
                direction = "IN"
                merchant = match.group(1).strip()
                break
        else:
            for pattern in _EN_SENT_PATTERNS:
                match = pattern.search(subject)
                if match:
                    merchant = match.group(1).strip()
                    break

        amount, currency = self._extract_amount_from_text(body)
        if amount is None:
            amount, currency = self._extract_amount_from_text(subject)
        if amount is None:
            return None

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

    def _parse_amount(self, raw: str) -> Decimal | None:
        """Parse amount string handling European comma format."""
        try:
            # Handle European format: 247,68 → 247.68 or 1.234,56 → 1234.56
            if "," in raw and "." in raw:
                # 1.234,56 format
                cleaned = raw.replace(".", "").replace(",", ".")
            elif "," in raw:
                cleaned = raw.replace(",", ".")
            else:
                cleaned = raw
            return Decimal(cleaned)
        except InvalidOperation:
            return None

    def _extract_amount_from_text(self, text: str) -> tuple[Decimal | None, str | None]:
        """Extract amount and currency from free text."""
        for pattern in _AMOUNT_PATTERNS:
            match = pattern.search(text)
            if match:
                groups = match.groups()
                if groups[0] in _CURRENCY_SYMBOLS:
                    # Symbol-first: €50.00
                    currency = _CURRENCY_SYMBOLS[groups[0]]
                    amount = self._parse_amount(groups[1])
                elif groups[0].isalpha():
                    # Currency-code-first: EUR 16,43
                    currency = groups[0]
                    amount = self._parse_amount(groups[1])
                else:
                    # Amount-first: 50.00 EUR
                    amount = self._parse_amount(groups[0])
                    currency = groups[1]
                if amount is not None:
                    return amount, currency
        return None, None
