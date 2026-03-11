"""Base class for bank email templates."""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime
from decimal import Decimal


@dataclass
class TransactionData:
    """Parsed transaction data extracted from a bank email."""

    amount: Decimal
    currency: str
    merchant: str
    date: datetime
    direction: str  # "IN" or "OUT"
    raw_description: str
    bank_name: str
    message_id: str


class BankEmailTemplate(ABC):
    """Abstract base for bank-specific email parsers."""

    @property
    @abstractmethod
    def bank_name(self) -> str:
        """Human-readable bank name (e.g. 'Revolut')."""

    @abstractmethod
    def matches(self, from_addr: str, subject: str) -> bool:
        """Return True if this template handles the given email."""

    @abstractmethod
    def extract(
        self,
        html_body: str,
        text_body: str,
        subject: str,
        date: datetime,
        message_id: str,
    ) -> TransactionData | None:
        """Extract transaction data from the email body. Return None if extraction fails."""
