import { Router, Request, Response } from "express";
import { transferErc20 } from "../services/contract.js";
import { isBlacklisted } from "../services/dbService.js";
import { asyncHandler, HttpError } from "../middleware/error.js";
import { assertSupportedNetwork, assertValidAddress } from "../utils/validation.js";

const router = Router();

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
  const tx = await transferErc20({ network, tokenAddress: token, to, amount });
  res.status(202).json(tx);
}));

export default router;
