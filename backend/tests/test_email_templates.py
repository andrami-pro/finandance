"""Unit tests for bank email template parsers."""

from decimal import Decimal

from app.services.email_templates import detect_and_parse
from app.services.email_templates.bancolombia import BancolombiaTemplate
from app.services.email_templates.revolut import RevolutTemplate
from app.services.email_templates.sumeria import SumeriaTemplate
from app.services.email_templates.wise import WiseTemplate

_DATE = "2025-06-15T14:30:00"
_MSG_ID = "<test-123@example.com>"


# --- Revolut (Spanish UI) ---


class TestRevolutTemplate:
    def test_matches_revolut_sender(self):
        t = RevolutTemplate()
        assert t.matches("Revolut <no-reply@revolut.com>", "Enviaste EUR 100")
        assert t.matches("no-reply@revolut.com", "Payment to Amazon")
        assert not t.matches("alerts@somebank.com", "Enviaste EUR 100")

    def test_enviaste_eur(self):
        result = detect_and_parse(
            from_addr="Revolut <no-reply@revolut.com>",
            subject="Enviaste EUR 247,68 a SAMY BEN LETAIEF 💸",
            html_body="",
            text_body="Transfer details...",
            date=_DATE,
            message_id=_MSG_ID,
        )
        assert result is not None
        assert result.bank_name == "Revolut"
        assert result.amount == Decimal("247.68")
        assert result.currency == "EUR"
        assert result.direction == "OUT"
        assert result.merchant == "SAMY BEN LETAIEF"

    def test_enviaste_chf_integer(self):
        result = detect_and_parse(
            from_addr="Revolut <no-reply@revolut.com>",
            subject="Enviaste CHF 200 a Mt Pelerin Group SA 💸",
            html_body="",
            text_body="Transfer details...",
            date=_DATE,
            message_id=_MSG_ID,
        )
        assert result is not None
        assert result.amount == Decimal("200")
        assert result.currency == "CHF"
        assert result.direction == "OUT"
        assert result.merchant == "Mt Pelerin Group SA"

    def test_tu_pedido_with_body_amount(self):
        result = detect_and_parse(
            from_addr="Revolut <no-reply@revolut.com>",
            subject="Tu pedido de Shotgun 🛍️",
            html_body="",
            text_body="Has pagado €15.99 por tu pedido.",
            date=_DATE,
            message_id=_MSG_ID,
        )
        assert result is not None
        assert result.direction == "OUT"
        assert result.merchant == "Shotgun"
        assert result.amount == Decimal("15.99")

    def test_english_outgoing_payment(self):
        result = detect_and_parse(
            from_addr="no-reply@revolut.com",
            subject="Payment to Amazon",
            html_body="",
            text_body="You made a payment of €25.99 to Amazon.",
            date=_DATE,
            message_id=_MSG_ID,
        )
        assert result is not None
        assert result.direction == "OUT"
        assert result.amount == Decimal("25.99")
        assert result.merchant == "Amazon"

    def test_english_incoming_transfer(self):
        result = detect_and_parse(
            from_addr="no-reply@revolut.com",
            subject="You received €50.00 from John Doe",
            html_body="",
            text_body="You received €50.00 from John Doe.",
            date=_DATE,
            message_id=_MSG_ID,
        )
        assert result is not None
        assert result.direction == "IN"
        assert result.amount == Decimal("50.00")

    def test_no_amount_returns_none(self):
        result = detect_and_parse(
            from_addr="no-reply@revolut.com",
            subject="Welcome to Revolut!",
            html_body="",
            text_body="Thank you for joining Revolut.",
            date=_DATE,
            message_id=_MSG_ID,
        )
        assert result is None


# --- Wise ---


class TestWiseTemplate:
    def test_matches_wise_sender(self):
        t = WiseTemplate()
        assert t.matches("no-reply@wise.com", "You sent 100.00 EUR")
        assert t.matches("no-reply@transferwise.com", "Transfer complete")
        assert not t.matches("no-reply@revolut.com", "You sent 100.00 EUR")

    def test_outgoing_transfer(self):
        result = detect_and_parse(
            from_addr="no-reply@wise.com",
            subject="You sent 100.00 EUR to Maria Garcia",
            html_body="",
            text_body="Your transfer of 100.00 EUR to Maria Garcia is complete.",
            date=_DATE,
            message_id=_MSG_ID,
        )
        assert result is not None
        assert result.bank_name == "Wise"
        assert result.amount == Decimal("100.00")
        assert result.currency == "EUR"
        assert result.direction == "OUT"
        assert result.merchant == "Maria Garcia"

    def test_incoming_transfer(self):
        result = detect_and_parse(
            from_addr="no-reply@wise.com",
            subject="John Doe sent you 75.50 GBP",
            html_body="",
            text_body="John Doe sent you 75.50 GBP.",
            date=_DATE,
            message_id=_MSG_ID,
        )
        assert result is not None
        assert result.direction == "IN"
        assert result.amount == Decimal("75.50")
        assert result.currency == "GBP"


# --- Sumeria ---


class TestSumeriaTemplate:
    def test_matches_sumeria_sender(self):
        t = SumeriaTemplate()
        assert t.matches("Sumeria <support@info.sumeria.eu>", "- 10,00 € à FDJ")
        assert t.matches("support@info.sumeria.eu", "test")
        assert not t.matches("no-reply@wise.com", "- 10,00 €")

    def test_outgoing_payment(self):
        result = detect_and_parse(
            from_addr="Sumeria <support@info.sumeria.eu>",
            subject="- 10,00 € à FDJ",
            html_body="",
            text_body="Paiement effectué.",
            date=_DATE,
            message_id=_MSG_ID,
        )
        assert result is not None
        assert result.bank_name == "Sumeria"
        assert result.amount == Decimal("10.00")
        assert result.currency == "EUR"
        assert result.direction == "OUT"
        assert result.merchant == "FDJ"

    def test_outgoing_atm(self):
        result = detect_and_parse(
            from_addr="Sumeria <support@info.sumeria.eu>",
            subject="- 100,00 € au distributeur",
            html_body="",
            text_body="Retrait effectué.",
            date=_DATE,
            message_id=_MSG_ID,
        )
        assert result is not None
        assert result.amount == Decimal("100.00")
        assert result.direction == "OUT"
        assert result.merchant == "distributeur"

    def test_incoming_refund(self):
        result = detect_and_parse(
            from_addr="Sumeria <support@info.sumeria.eu>",
            subject="+ 1,00 € de THEFORK - Paiement annulé",
            html_body="",
            text_body="La somme a été recréditée.",
            date=_DATE,
            message_id=_MSG_ID,
        )
        assert result is not None
        assert result.direction == "IN"
        assert result.amount == Decimal("1.00")
        assert result.merchant == "THEFORK"

    def test_outgoing_with_merchant_code(self):
        result = detect_and_parse(
            from_addr="Sumeria <support@info.sumeria.eu>",
            subject="- 20,00 € à SumUp  *LCP MCS3ZCHS",
            html_body="",
            text_body="Paiement effectué.",
            date=_DATE,
            message_id=_MSG_ID,
        )
        assert result is not None
        assert result.amount == Decimal("20.00")
        assert result.direction == "OUT"
        assert "SumUp" in result.merchant

    def test_outgoing_remitly(self):
        result = detect_and_parse(
            from_addr="Sumeria <support@info.sumeria.eu>",
            subject="- 31,03 € à Remitly",
            html_body="",
            text_body="Paiement effectué.",
            date=_DATE,
            message_id=_MSG_ID,
        )
        assert result is not None
        assert result.amount == Decimal("31.03")
        assert result.merchant == "Remitly"


# --- Bancolombia ---


class TestBancolombiaTemplate:
    def test_matches_bancolombia_sender(self):
        t = BancolombiaTemplate()
        assert t.matches(
            "alertasynotificaciones@notificacionesbancolombia.com",
            "Bancolombia le informa",
        )
        assert not t.matches("no-reply@wise.com", "Bancolombia")

    def test_real_pagaste_format(self):
        result = detect_and_parse(
            from_addr="Alertas y Notificaciones <alertasynotificaciones@an.notificacionesbancolombia.com>",
            subject="Alertas y Notificaciones",
            html_body="",
            text_body="Pagaste $103,098.00 a Tigo servicios vil desde tu producto *6798 el 26/01/2026 17:05.",
            date=_DATE,
            message_id=_MSG_ID,
        )
        assert result is not None
        assert result.bank_name == "Bancolombia"
        assert result.amount == Decimal("103098.00")
        assert result.currency == "COP"
        assert result.direction == "OUT"
        assert result.merchant == "Tigo servicios vil"

    def test_compra_colombian_format(self):
        result = detect_and_parse(
            from_addr="alertasynotificaciones@an.notificacionesbancolombia.com",
            subject="Alertas y Notificaciones",
            html_body="",
            text_body="Compra por $50.000,00 en ALMACENES EXITO desde tu producto *1234.",
            date=_DATE,
            message_id=_MSG_ID,
        )
        assert result is not None
        assert result.amount == Decimal("50000.00")
        assert result.direction == "OUT"
        assert result.merchant == "ALMACENES EXITO"

    def test_incoming_consignacion(self):
        result = detect_and_parse(
            from_addr="alertasynotificaciones@an.notificacionesbancolombia.com",
            subject="Alertas y Notificaciones",
            html_body="",
            text_body="Recibiste consignación de $1,500,000.00 de JUAN PEREZ en tu producto *6798.",
            date=_DATE,
            message_id=_MSG_ID,
        )
        assert result is not None
        assert result.direction == "IN"
        assert result.amount == Decimal("1500000.00")


# --- Unknown bank ---


class TestUnknownBank:
    def test_unknown_sender_returns_none(self):
        result = detect_and_parse(
            from_addr="alerts@unknownbank.com",
            subject="Transaction notification",
            html_body="<p>You spent $100</p>",
            text_body="You spent $100",
            date=_DATE,
            message_id=_MSG_ID,
        )
        assert result is None
