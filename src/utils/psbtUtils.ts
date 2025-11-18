import { address, networks, initEccLib } from "bitcoinjs-lib";
import * as ecc from "tiny-secp256k1";

/**
 * Utility functions for PSBT processing and formatting
 */

// Initialize bitcoinjs-lib with ECC library for Taproot support
initEccLib(ecc);

/**
 * Formats a sequence number as a hex string with 0x prefix
 * @param sequence - The sequence number (e.g., 4294967293)
 * @returns Hex formatted string (e.g., "0xfffffffd")
 */
export function formatSequenceAsHex(sequence: number): string {
  return `0x${sequence.toString(16).padStart(8, "0")}`;
}

/**
 * Calculates the address from a script pubkey
 * @param scriptPubkey - The script pubkey as a hex string
 * @param network - The network ('bitcoin' or 'testnet4')
 * @returns The Bitcoin address
 */
export function calculateAddress(
  scriptPubkey: Buffer,
  network: "bitcoin" | "testnet4"
): string {
  try {
    // Convert hex string to Buffer

    // Get network object
    const net = network === "testnet4" ? networks.testnet : networks.bitcoin;

    const addressString = address.fromOutputScript(scriptPubkey, net) as string;
    return addressString;
  } catch (error) {
    console.error("Error calculating address:", error);
    return scriptPubkey.toString("hex");
  }
}

/**
 * Formats a value in satoshis to BTC with proper formatting
 * @param value - Value in satoshis
 * @returns Formatted BTC string
 */
export function formatBTC(value: number): string {
  return (Number(value) / 100000000).toFixed(8);
}

/**
 * Formats a sighash type number to a readable string
 * @param sighashType - The sighash type number (e.g., 0x01, 0x03)
 * @returns Formatted sighash string (e.g., "SIGHASH_ALL", "SIGHASH_SINGLE|ANYONECANPAY")
 */
export function formatSighashFlag(sighashType: number | undefined): string {
  if (sighashType === undefined) return "-";

  const SIGHASH_ALL = 0x01;
  const SIGHASH_NONE = 0x02;
  const SIGHASH_SINGLE = 0x03;
  const SIGHASH_ANYONECANPAY = 0x80;

  const base = sighashType & 0x1f;
  const anyoneCanPay = (sighashType & SIGHASH_ANYONECANPAY) !== 0;

  let flag = "";
  if (base === SIGHASH_ALL) flag = "SIGHASH_ALL";
  else if (base === SIGHASH_NONE) flag = "SIGHASH_NONE";
  else if (base === SIGHASH_SINGLE) flag = "SIGHASH_SINGLE";
  else flag = `0x${sighashType.toString(16)}`;

  if (anyoneCanPay) flag += "|ANYONECANPAY";

  return flag;
}
