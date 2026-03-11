"""Bancolombia email notification parser.

Real Bancolombia email patterns (from actual samples):
- Sender: Alertas y Notificaciones <alertasynotificaciones@an.notificacionesbancolombia.com>
- Subject: "Alertas y Notificaciones"
- Body pattern: "Pagaste $103,098.00 a Tigo servicios vil desde tu producto *6798 el 26/01/2026 17:05"
- Also handles: "Recibiste $X a tu producto", "Transferencia por $X a NOMBRE"
"""

from __future__ import annotations

import re
from datetime import datetime
from decimal import Decimal, InvalidOperation

from .base import BankEmailTemplate, TransactionData

_BANCOLOMBIA_SENDERS = [
    "notificacionesbancolombia.com",
    "bancolombia.com.co",
]

_OUTGOING_KEYWORDS = [
    r"pagaste",
    r"compra",
    r"pago",
    r"retiro",
    r"d[eé]bito",
]
_INCOMING_KEYWORDS = [
    r"recibiste",
    r"consignaci[oó]n",
    r"te transfirieron",
    r"abono",
    r"cr[eé]dito",
]

# Body patterns: "Pagaste $103,098.00 a Tigo servicios vil desde tu producto"
_BODY_TRANSACTION_PATTERNS = [
    # Pagaste $X a MERCHANT desde tu producto
    re.compile(
        r"Pagaste\s+\$\s*([\d,]+\.\d{2})\s+a\s+(.+?)\s+desde\s+tu\s+producto",
        re.IGNORECASE,
    ),
    # Recibiste transferencia/consignación de $X de MERCHANT
    re.compile(
        r"(?:Recibiste|Te transfirieron)\s+\$\s*([\d,]+\.\d{2})\s+(?:de|desde)\s+(.+?)\s+(?:en|a)\s+tu\s+producto",
        re.IGNORECASE,
    ),
    # Compra por $X en MERCHANT
    re.compile(
        r"[Cc]ompra\s+(?:por\s+)?\$\s*([\d.,]+)\s+en\s+(.+?)(?:\.|,|\s+desde|\s+el\b)",
    ),
    # Transferencia por $X a MERCHANT
    re.compile(
        r"[Tt]ransferencia\s+(?:por\s+)?\$\s*([\d.,]+)\s+a\s+(.+?)(?:\.|,|\s+desde|\s+el\b)",
    ),
]


class BancolombiaTemplate(BankEmailTemplate):
    @property
    def bank_name(self) -> str:
        return "Bancolombia"

    def matches(self, from_addr: str, subject: str) -> bool:
        from_lower = from_addr.lower()
        return any(sender in from_lower for sender in _BANCOLOMBIA_SENDERS)

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

        # Try structured body patterns first
        for pattern in _BODY_TRANSACTION_PATTERNS:
            match = pattern.search(body)
            if match:
                raw_amount, merchant = match.group(1), match.group(2)
                amount = self._parse_amount(raw_amount)
                if amount is None:
                    continue

                direction = self._detect_direction(body)

                return TransactionData(
                    amount=amount,
                    currency="COP",
                    merchant=merchant.strip(),
                    date=date,
                    direction=direction,
                    raw_description=subject,
                    bank_name=self.bank_name,
                    message_id=message_id,
                )

        # Fallback: extract amount and merchant separately
        amount = self._extract_amount(body)
        if amount is None:
            return None

        merchant = self._extract_merchant_fallback(body)
        direction = self._detect_direction(body)

        return TransactionData(
            amount=amount,
            currency="COP",
            merchant=merchant,
            date=date,
            direction=direction,
            raw_description=subject,
            bank_name=self.bank_name,
            message_id=message_id,
        )

    def _detect_direction(self, body: str) -> str:
        """Detect direction. Outgoing keywords take priority since
        'crédito' can appear in footer text (e.g. 'tarjeta de crédito')."""
        body_lower = body.lower()
        if any(re.search(p, body_lower) for p in _OUTGOING_KEYWORDS):
            return "OUT"
        if any(re.search(p, body_lower) for p in _INCOMING_KEYWORDS):
            return "IN"
        return "OUT"

    def _parse_amount(self, raw: str) -> Decimal | None:
        """Parse amount from various Colombian formats."""
        try:
            # $103,098.00 format (US-style)
            if "," in raw and "." in raw:
                if raw.rindex(".") > raw.rindex(","):
                    # Comma as thousands: 103,098.00
                    return Decimal(raw.replace(",", ""))
                else:
                    # Dot as thousands: 1.234.567,89
                    return Decimal(raw.replace(".", "").replace(",", "."))
            elif "," in raw:
                # Comma as decimal: 50000,00
                return Decimal(raw.replace(",", "."))
            else:
                return Decimal(raw)
        except InvalidOperation:
            return None

    def _extract_amount(self, text: str) -> Decimal | None:
        """Extract amount from text using $ patterns."""
        # $103,098.00 or $1.500.000,00 or $50000
        match = re.search(r"\$\s*([\d.,]+)", text)
        if match:
            return self._parse_amount(match.group(1))
        return None

    def _extract_merchant_fallback(self, body: str) -> str:
        """Fallback merchant extraction."""
        for pattern in [
            r"(?:pagaste|compra|pago)\s+.+?\s+(?:a|en)\s+(.+?)(?:\s+desde|\s+el\b|\.|,|$)",
            r"establecimiento[:\s]*(.+?)(?:\.|,|\n|$)",
            r"comercio[:\s]*(.+?)(?:\.|,|\n|$)",
        ]:
            match = re.search(pattern, body, re.IGNORECASE)
            if match:
                merchant = match.group(1).strip()
                # Clean up URLs and image references
                merchant = re.sub(r"\s*\[https?://.*", "", merchant)
                if merchant:
                    return merchant
        return "Bancolombia"
