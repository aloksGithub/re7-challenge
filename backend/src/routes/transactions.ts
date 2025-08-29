import { Router, Request, Response } from "express";
import { getTransactions } from "../services/dbService.js";
import { asyncHandler } from "../middleware/error.js";
import { assertValidAddress } from "../utils/validation.js";

const router = Router();

router.get("/transactions/:address/:token", asyncHandler(async (req: Request, res: Response) => {
  const { address, token } = req.params;
  assertValidAddress(address, "address");
  assertValidAddress(token, "token");
  const transactions = await getTransactions({ from: address, tokenAddress: token });
  res.json(transactions);
}));

export default router;


