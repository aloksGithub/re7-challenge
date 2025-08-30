import { Router, Request, Response } from "express";
import { getBalances } from "../services/contract.js";
import { getSupportedTokensForNetwork } from "../services/dbService.js";
import { asyncHandler } from "../middleware/error.js";
import { assertSupportedNetwork, assertValidAddress } from "../utils/validation.js";

const router = Router();

// Tokens held by address (on default/implicit network via service)
router.get("/tokens/:address", asyncHandler(async (req: Request, res: Response) => {
  const { address } = req.params;
  assertValidAddress(address, "address");
  const balances = await getBalances(address);
  res.json(balances);
}));

// Supported tokens for a network (DB-managed)
router.get("/supported-tokens/:network", asyncHandler(async (req: Request, res: Response) => {
  const { network } = req.params;
  assertSupportedNetwork(network);
  const tokens = await getSupportedTokensForNetwork(network);
  res.json(tokens);
}));

export default router;


