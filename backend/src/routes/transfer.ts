import { Router, Request, Response } from "express";
import { getAddressFromEnv, transferErc20 } from "../services/contract.js";
import { addTransaction, isBlacklisted } from "../services/dbService.js";
import { asyncHandler, HttpError } from "../middleware/error.js";
import { assertSupportedNetwork, assertValidAddress } from "../utils/validation.js";

const router = Router();

function mapTransferError(err: any): { status: number; message: string; code?: string; details?: unknown } {
  const rawMessage: string = String(err?.message ?? err ?? "");
  const code: string | undefined = err?.code || err?.error?.code;

  const lower = rawMessage.toLowerCase();
  if (code === "INSUFFICIENT_FUNDS" || lower.includes("insufficient funds")) {
    return { status: 400, message: "Insufficient funds for gas or value", code: "INSUFFICIENT_FUNDS" };
  }
  if (code === "CALL_EXCEPTION" || lower.includes("revert")) {
    return { status: 400, message: "Transaction reverted", code: "CALL_EXCEPTION" };
  }
  if (code === "UNPREDICTABLE_GAS_LIMIT") {
    return { status: 400, message: "Cannot estimate gas; transaction may fail", code: "UNPREDICTABLE_GAS_LIMIT" };
  }
  if (code === "INVALID_ARGUMENT" || lower.includes("invalid address") || lower.includes("invalid argument")) {
    return { status: 400, message: "Invalid parameter", code: "INVALID_ARGUMENT" };
  }
  if (code === "NETWORK_ERROR" || lower.includes("network error")) {
    return { status: 503, message: "Upstream network error", code: "NETWORK_ERROR" };
  }
  if (code === "TIMEOUT" || lower.includes("timeout")) {
    return { status: 504, message: "Upstream timeout", code: "TIMEOUT" };
  }
  if (lower.includes("private_key is required")) {
    return { status: 500, message: "Server misconfigured: missing signing key", code: "CONFIG_ERROR" };
  }
  // Some providers return HTTP-like codes embedded in the message; normalize to common 5xx
  const embeddedStatus = rawMessage.match(/\b(4\d{2}|5\d{2})\b/);
  if (embeddedStatus) {
    const n = Number(embeddedStatus[1]);
    if (n >= 400 && n < 500) return { status: n, message: "Request failed", code };
    if (n >= 500 && n < 600) return { status: n, message: "Upstream service error", code };
  }
  return { status: 500, message: "Transfer failed", code, details: process.env.NODE_ENV !== "production" ? rawMessage : undefined };
}

router.post("/transfer", asyncHandler(async (req: Request, res: Response) => {
  const { to, token, amount, network } = req.body ?? {};
  assertSupportedNetwork(network);
  assertValidAddress(to, "to");
  assertValidAddress(token, "token");
  if (!amount) throw new HttpError(400, "amount is required");
  const isAddressBlacklisted = await isBlacklisted(to);
  if (isAddressBlacklisted) {
    throw new HttpError(400, "to address is blacklisted");
  }
  let tx;
  try {
    tx = await transferErc20({ network, tokenAddress: token, to, amount });
  } catch (err) {
    const mapped = mapTransferError(err);
    throw new HttpError(mapped.status, mapped.message, mapped.code, mapped.details);
  }
  await addTransaction({
    fromAddress: getAddressFromEnv(),
    toAddress: to,
    tokenAddress: token,
    amount,
    network,
    txHash: tx.hash,
  })
  res.status(202).json(tx);
}));

export default router;
