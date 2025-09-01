import { Router, Request, Response } from 'express';
import { getAddressFromEnv } from '../services/contract.js';

const router = Router();

router.get('/wallet-address', async (_req: Request, res: Response) => {
  const address = getAddressFromEnv();
  res.json(address);
});

export default router;
