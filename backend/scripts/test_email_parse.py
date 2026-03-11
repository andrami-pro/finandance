"""Script to test email parsing from .eml files.

Usage:
    python -m scripts.test_email_parse ./scripts/samples/revolut-payment.eml
    python -m scripts.test_email_parse ./scripts/samples/    # parse all .eml in directory

Options:
    --verbose    Show full email body in output
"""

from __future__ import annotations

import argparse
import email
import email.policy
import sys
from pathlib import Path

# Add backend root to path for imports
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.services.email_templates import detect_and_parse


def parse_eml_file(filepath: Path) -> dict:
    """Parse a .eml file and return structured email data."""
    with open(filepath, "rb") as f:
        msg = email.message_from_binary_file(f, policy=email.policy.default)

    from_addr = msg.get("From", "")
    subject = msg.get("Subject", "")
    date = msg.get("Date", "")
    message_id = msg.get("Message-ID", f"local-{filepath.name}")

    html_body = ""
    text_body = ""

    if msg.is_multipart():
        for part in msg.walk():
            content_type = part.get_content_type()
            if content_type == "text/plain":
                text_body = part.get_content()
            elif content_type == "text/html":
                html_body = part.get_content()
    else:
        content_type = msg.get_content_type()
        content = msg.get_content()
        if content_type == "text/html":
            html_body = content
        else:
            text_body = content

    return {
        "from_addr": from_addr,
        "subject": subject,
        "date": date,
        "message_id": message_id,
        "html_body": html_body,
        "text_body": text_body,
    }


def process_file(filepath: Path, verbose: bool = False) -> None:
    """Process a single .eml file and print results."""
    print(f"\n{'=' * 60}")
    print(f"File: {filepath.name}")
    print(f"{'=' * 60}")

    try:
        email_data = parse_eml_file(filepath)
    except Exception as e:
        print(f"  ERROR reading file: {e}")
        return

    print(f"  From:    {email_data['from_addr']}")
    print(f"  Subject: {email_data['subject']}")
    print(f"  Date:    {email_data['date']}")

    if verbose:
        body = email_data["text_body"] or email_data["html_body"]
        print(f"  Body:    {body[:500]}...")

    result = detect_and_parse(
        from_addr=email_data["from_addr"],
        subject=email_data["subject"],
        html_body=email_data["html_body"],
        text_body=email_data["text_body"],
        date=email_data["date"] or "2025-01-01T00:00:00",
        message_id=email_data["message_id"],
    )

    if result:
        print("\n  PARSED TRANSACTION:")
        print(f"    Bank:        {result.bank_name}")
        print(f"    Amount:      {result.amount} {result.currency}")
        print(f"    Direction:   {result.direction}")
        print(f"    Merchant:    {result.merchant}")
        print(f"    Date:        {result.date}")
        print(f"    Description: {result.raw_description}")
        print(f"    Message ID:  {result.message_id}")
    else:
        print("\n  NO MATCH — no template recognized this email")


def main() -> None:
    parser = argparse.ArgumentParser(description="Test email parsing from .eml files")
    parser.add_argument("path", help="Path to .eml file or directory of .eml files")
    parser.add_argument("--verbose", action="store_true", help="Show email body")
    args = parser.parse_args()

    target = Path(args.path)

    if target.is_file():
        process_file(target, verbose=args.verbose)
    elif target.is_dir():
        eml_files = sorted(target.glob("*.eml"))
        if not eml_files:
            print(f"No .eml files found in {target}")
            sys.exit(1)
        print(f"Found {len(eml_files)} .eml file(s) in {target}")
        for f in eml_files:
            process_file(f, verbose=args.verbose)
    else:
        print(f"Error: {target} is not a file or directory")
        sys.exit(1)

    print(f"\n{'=' * 60}")
    print("Done.")


if __name__ == "__main__":
    main()
