import { Router, Request, Response } from "express";
import { addSupportedTokensForNetwork, blacklistAddress, removeSupportedToken } from "../services/dbService.js";
import { asyncHandler, HttpError } from "../middleware/error.js";
import { assertSupportedNetwork, assertValidAddress } from "../utils/validation.js";

const router = Router();

router.post("/blacklist", asyncHandler(async (req: Request, res: Response) => {
  const { address, reason } = req.body ?? {};
  assertValidAddress(address, "address");
  await blacklistAddress(address, reason);
  res.status(200).json({ message: "address blacklisted" });
}));

router.post("/add-supported-token", asyncHandler(async (req: Request, res: Response) => {
  const { network, token } = req.body ?? {};
  assertSupportedNetwork(network);
  if (!token) throw new HttpError(400, "token is required");
  if (token.tokenAddress) assertValidAddress(token.tokenAddress, "tokenAddress");
  const result = await addSupportedTokensForNetwork(network, [token]);
  res.status(200).json(result);
}));

router.post("/remove-supported-token", asyncHandler(async (req: Request, res: Response) => {
  const { network, token } = req.body ?? {};
  assertSupportedNetwork(network);
  assertValidAddress(token, "token");
  const result = await removeSupportedToken(network, token);
  res.status(200).json(result);
}));

export default router;


