import { Router, Request, Response } from "express";
import { addSupportedTokensForNetwork, blacklistAddress, removeSupportedToken } from "../services/dbService.js";
import { asyncHandler, HttpError } from "../middleware/error.js";
import { assertSupportedNetwork, assertValidAddress } from "../utils/validation.js";
import { requireApiKey } from "../middleware/apiKey.js";
import { validate } from "../middleware/validate.js";
import { z } from "zod";

const router = Router();

const blacklistBody = z.object({
  address: z.string().min(1),
  reason: z.string().max(200).optional(),
});

const addTokenBody = z.object({
  network: z.string().min(1),
  token: z.object({
    tokenAddress: z.string().min(1),
    symbol: z.string().min(1),
    name: z.string().min(1),
    decimals: z.number().int().min(0).max(36),
    enabled: z.boolean().optional(),
  }),
});

const removeTokenBody = z.object({
  network: z.string().min(1),
  token: z.string().min(1),
});

router.post("/blacklist", requireApiKey, validate(blacklistBody), asyncHandler(async (req: Request, res: Response) => {
  const { address, reason } = req.body as z.infer<typeof blacklistBody>;
  assertValidAddress(address, "address");
  await blacklistAddress(address, reason);
  res.status(200).json({ message: "address blacklisted" });
}));

router.post("/add-supported-token", requireApiKey, validate(addTokenBody), asyncHandler(async (req: Request, res: Response) => {
  const { network, token } = req.body as z.infer<typeof addTokenBody>;
  assertSupportedNetwork(network);
  if (!token) throw new HttpError(400, "token is required");
  if (token.tokenAddress) assertValidAddress(token.tokenAddress, "tokenAddress");
  const result = await addSupportedTokensForNetwork(network, [token]);
  res.status(200).json(result);
}));

router.post("/remove-supported-token", requireApiKey, validate(removeTokenBody), asyncHandler(async (req: Request, res: Response) => {
  const { network, token } = req.body as z.infer<typeof removeTokenBody>;
  assertSupportedNetwork(network);
  assertValidAddress(token, "token");
  const result = await removeSupportedToken(network, token);
  res.status(200).json(result);
}));

export default router;


