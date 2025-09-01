import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../src/app.js';
import * as dbSvc from '../../src/services/dbService.js';

vi.mock('../../src/services/dbService.js');

describe('admin routes', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('POST /blacklist blacklists an address', async () => {
    (dbSvc.blacklistAddress as any).mockResolvedValue(undefined);
    const res = await request(app)
      .post('/blacklist')
      .set('x-api-key', process.env.API_KEY || 'test-key')
      .send({ address: '0x0000000000000000000000000000000000000001', reason: 'fraud' })
      .expect(200);
    expect(res.body).toEqual({ message: 'address blacklisted' });
    expect(dbSvc.blacklistAddress).toHaveBeenCalled();
  });

  it('POST /add-supported-token adds a token', async () => {
    (dbSvc.addSupportedTokensForNetwork as any).mockResolvedValue({ created: 1, skipped: 0 });
    const res = await request(app)
      .post('/add-supported-token')
      .set('x-api-key', process.env.API_KEY || 'test-key')
      .send({
        network: 'sepolia',
        token: {
          tokenAddress: '0x0000000000000000000000000000000000000001',
          symbol: 'T',
          name: 'Tok',
          decimals: 18,
        },
      })
      .expect(200);
    expect(res.body).toEqual({ created: 1, skipped: 0 });
    expect(dbSvc.addSupportedTokensForNetwork).toHaveBeenCalled();
  });

  it('POST /remove-supported-token removes a token', async () => {
    (dbSvc.removeSupportedToken as any).mockResolvedValue(1);
    const res = await request(app)
      .post('/remove-supported-token')
      .set('x-api-key', process.env.API_KEY || 'test-key')
      .send({ network: 'sepolia', token: '0x0000000000000000000000000000000000000001' })
      .expect(200);
    expect(res.body).toBe(1);
    expect(dbSvc.removeSupportedToken).toHaveBeenCalled();
  });

  it('requires API key for admin routes', async () => {
    await request(app)
      .post('/blacklist')
      .send({ address: '0x0000000000000000000000000000000000000001' })
      .expect(401);
  });
});
