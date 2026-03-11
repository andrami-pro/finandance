"""Quick script to fetch Ledger transactions from the blockchain.

Reads the Ledger integration from Supabase (public_address + chain),
then queries the public blockchain API for recent transactions.

Usage:
    cd backend && python -m scripts.test_ledger_txns
"""

import asyncio
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.core.db import get_supabase
from app.services.ledger_service import LedgerService


def get_ledger_integration() -> dict | None:
    """Fetch the LEDGER integration row from Supabase."""
    client = get_supabase()
    result = (
        client.table("integrations")
        .select("id, user_id, provider_name, public_address, chain, status, last_synced_at")
        .eq("provider_name", "LEDGER")
        .limit(1)
        .execute()
    )
    if result.data:
        return result.data[0]
    return None


async def main() -> None:
    print("🔍 Buscando integración Ledger en Supabase...")
    integration = get_ledger_integration()

    if not integration:
        print("❌ No se encontró ninguna integración Ledger configurada.")
        return

    address = integration["public_address"]
    chain = integration.get("chain") or "BTC"
    status = integration["status"]

    print("✅ Integración encontrada:")
    print(f"   Chain:   {chain}")
    print(f"   Address: {address}")
    print(f"   Status:  {status}")
    print(f"   Last synced: {integration.get('last_synced_at', 'Never')}")
    print()

    print(f"📡 Consultando transacciones en {chain} blockchain...")
    service = LedgerService(public_address=address, chain=chain)

    # Also fetch balance
    sources = await service.get_funding_sources()
    for src in sources:
        print(f"   💰 Balance: {src['current_balance']} {src['currency']}")
    print()

    txns = await service.get_transactions()
    print(f"📋 {len(txns)} transacciones encontradas:\n")

    for i, tx in enumerate(txns, 1):
        amount = tx["amount"]
        sign = "+" if amount > 0 else ""
        print(
            f"  {i:3}. {tx['transaction_date'] or 'pending':25s}  {sign}{amount:>15} {tx['currency']}  {tx['description']}"
        )

    print(f"\n✅ Total: {len(txns)} transacciones")


if __name__ == "__main__":
    asyncio.run(main())
