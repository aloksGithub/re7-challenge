import { Router, Request, Response } from 'express';
import { getBalances } from '../services/contract.js';
import { getSupportedTokensForNetwork } from '../services/dbService.js';
import { asyncHandler } from '../middleware/error.js';
import { validate } from '../middleware/validate.js';
import { z } from 'zod';
import { assertSupportedNetwork, assertValidAddress } from '../utils/validation.js';

const router = Router();

// Tokens held by address (on default/implicit network via service)
router.get(
  '/tokens/:address',
  asyncHandler(async (req: Request, res: Response) => {
    const { address } = req.params;
    assertValidAddress(address, 'address');
    const balances = await getBalances(address);
    res.json(balances);
  }),
);

// Supported tokens for a network (DB-managed)
const supportedTokensParams = z.object({ network: z.string().min(1) });

router.get(
  '/supported-tokens/:network',
  validate(supportedTokensParams, 'params'),
  asyncHandler(async (req: Request, res: Response) => {
    const { network } = req.params as z.infer<typeof supportedTokensParams>;
    assertSupportedNetwork(network);
    const tokens = await getSupportedTokensForNetwork(network);
    res.json(tokens);
  }),
);

export default router;
