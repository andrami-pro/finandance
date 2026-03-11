"""Sumeria email notification parser.

Real Sumeria email patterns (from actual samples):
- Sender: Sumeria <support@info.sumeria.eu>
- Subject format: "{sign} {amount} € {preposition} {merchant} [- note]"
  - "- 10,00 € à FDJ"
  - "- 100,00 € au distributeur"
  - "- 31,03 € à Remitly"
  - "+ 1,00 € de THEFORK - Paiement annulé"
  - "- 20,00 € à SumUp  *LCP MCS3ZCHS"

Direction is determined by the sign prefix:
  - "-" = OUT (payment/withdrawal)
  - "+" = IN (refund/received)
"""

from __future__ import annotations

import re
from datetime import datetime
from decimal import Decimal, InvalidOperation

from .base import BankEmailTemplate, TransactionData

_SUMERIA_SENDERS = [
    "support@info.sumeria.eu",
    "no-reply@sumeria.com",
    "noreply@sumeria.com",
    "no-reply@lydia-app.com",
    "noreply@lydia-app.com",
]

# Subject pattern: {+/-} {amount} € {à/de/au} {merchant}
_SUBJECT_PATTERN = re.compile(
    r"^([+-])\s*(\d{1,3}(?:[\s.]\d{3})*,\d{2})\s*€\s*(?:à|de|au)\s+(.+?)(?:\s*-\s*.+)?$"
)


class SumeriaTemplate(BankEmailTemplate):
    @property
    def bank_name(self) -> str:
        return "Sumeria"

    def matches(self, from_addr: str, subject: str) -> bool:
        from_lower = from_addr.lower()
        return any(sender in from_lower for sender in _SUMERIA_SENDERS)

    def extract(
        self,
        html_body: str,
        text_body: str,
        subject: str,
        date: datetime,
        message_id: str,
    ) -> TransactionData | None:
        # Try subject pattern first (most reliable)
        match = _SUBJECT_PATTERN.match(subject.strip())
        if match:
            sign, raw_amount, merchant = match.groups()
            try:
                amount = Decimal(raw_amount.replace(" ", "").replace(".", "").replace(",", "."))
            except InvalidOperation:
                return None

            return TransactionData(
                amount=amount,
                currency="EUR",
                merchant=merchant.strip(),
                date=date,
                direction="IN" if sign == "+" else "OUT",
                raw_description=subject,
                bank_name=self.bank_name,
                message_id=message_id,
            )

        # Fallback: try to extract from body
        body = text_body or html_body
        if not body:
            return None

        amount, merchant, direction = self._extract_from_body(body, subject)
        if amount is None:
            return None

        return TransactionData(
            amount=amount,
            currency="EUR",
            merchant=merchant,
            date=date,
            direction=direction,
            raw_description=subject,
            bank_name=self.bank_name,
            message_id=message_id,
        )

    def _extract_from_body(self, body: str, subject: str) -> tuple[Decimal | None, str, str]:
        """Fallback extraction from email body."""
        # Look for "paiement de X,XX € à MERCHANT"
        match = re.search(
            r"paiement de (\d{1,3}(?:[\s.]\d{3})*,\d{2})\s*€\s*à\s+(\S+)",
            body,
            re.IGNORECASE,
        )
        if match:
            try:
                amount = Decimal(match.group(1).replace(" ", "").replace(".", "").replace(",", "."))
                return amount, match.group(2).strip(), "OUT"
            except InvalidOperation:
                pass

        return None, "", "OUT"
