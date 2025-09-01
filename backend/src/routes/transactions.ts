import { Router, Request, Response } from 'express';
import { getTransactions } from '../services/dbService.js';
import { asyncHandler } from '../middleware/error.js';
import { assertValidAddress } from '../utils/validation.js';
import { validate } from '../middleware/validate.js';
import { z } from 'zod';

const router = Router();

const transactionsParams = z.object({ address: z.string().min(1), token: z.string().min(1) });

router.get(
  '/transactions/:address/:token',
  validate(transactionsParams, 'params'),
  asyncHandler(async (req: Request, res: Response) => {
    const { address, token } = req.params as z.infer<typeof transactionsParams>;
    assertValidAddress(address, 'address');
    assertValidAddress(token, 'token');
    const transactions = await getTransactions({ from: address, tokenAddress: token });
    res.json(transactions);
  }),
);

export default router;
