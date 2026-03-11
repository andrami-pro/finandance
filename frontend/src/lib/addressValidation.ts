/**
 * Client-side address format validators for BTC and ETH.
 *
 * These perform basic format checks only — no full checksum validation.
 * The backend should do thorough verification on submit.
 */

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

// ---------------------------------------------------------------------------
// BTC address validation
// ---------------------------------------------------------------------------

// Base58 characters (no 0, O, I, l)
const BASE58_REGEX = /^[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]+$/;
// Bech32 characters
const BECH32_REGEX = /^bc1[a-z0-9]+$/;

export function validateBtcAddress(address: string): ValidationResult {
  const trimmed = address.trim();

  if (!trimmed) {
    return { valid: false, error: "Address is required" };
  }

  // Bech32 / Bech32m (bc1...)
  if (trimmed.startsWith("bc1")) {
    if (trimmed.length < 25 || trimmed.length > 62) {
      return { valid: false, error: "Invalid Bech32 address length (25-62 characters expected)" };
    }
    if (!BECH32_REGEX.test(trimmed.toLowerCase())) {
      return { valid: false, error: "Invalid Bech32 address characters" };
    }
    return { valid: true };
  }

  // P2PKH (1...) or P2SH (3...)
  if (trimmed.startsWith("1") || trimmed.startsWith("3")) {
    if (trimmed.length < 25 || trimmed.length > 34) {
      return { valid: false, error: "Invalid Bitcoin address length (25-34 characters expected)" };
    }
    if (!BASE58_REGEX.test(trimmed)) {
      return { valid: false, error: "Invalid Bitcoin address characters" };
    }
    return { valid: true };
  }

  return { valid: false, error: "Bitcoin address must start with 1, 3, or bc1" };
}

// ---------------------------------------------------------------------------
// ETH address validation
// ---------------------------------------------------------------------------

const ETH_REGEX = /^0x[0-9a-fA-F]{40}$/;

export function validateEthAddress(address: string): ValidationResult {
  const trimmed = address.trim();

  if (!trimmed) {
    return { valid: false, error: "Address is required" };
  }

  if (!trimmed.startsWith("0x")) {
    return { valid: false, error: "Ethereum address must start with 0x" };
  }

  if (trimmed.length !== 42) {
    return { valid: false, error: "Ethereum address must be exactly 42 characters" };
  }

  if (!ETH_REGEX.test(trimmed)) {
    return { valid: false, error: "Ethereum address contains invalid characters" };
  }

  return { valid: true };
}

// ---------------------------------------------------------------------------
// Dispatcher
// ---------------------------------------------------------------------------

export type Network = "bitcoin" | "ethereum";

export function validateAddress(network: Network, address: string): ValidationResult {
  return network === "bitcoin" ? validateBtcAddress(address) : validateEthAddress(address);
}
