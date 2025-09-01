import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import app from '../../src/app.js';
import * as dbSvc from '../../src/services/dbService.js';

vi.mock('../../src/services/dbService.js');

describe('GET /transactions/:address/:token', () => {
  it('returns transactions for address and token', async () => {
    (dbSvc.getTransactions as any).mockResolvedValue([
      {
        id: '1',
        fromAddress: '0x0000000000000000000000000000000000000001',
        toAddress: '0x0000000000000000000000000000000000000002',
        tokenAddress: '0x0000000000000000000000000000000000000003',
        amount: '1000',
        network: 'sepolia',
        txHash: '0xhash',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    const addr = '0x0000000000000000000000000000000000000001';
    const token = '0x0000000000000000000000000000000000000003';
    const res = await request(app).get(`/transactions/${addr}/${token}`).expect(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0].fromAddress).toBe(addr.toLowerCase());
    expect(dbSvc.getTransactions).toHaveBeenCalledWith({ from: addr, tokenAddress: token });
  });
});
