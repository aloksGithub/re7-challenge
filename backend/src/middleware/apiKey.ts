import { NextFunction, Request, Response } from 'express';
import { HttpError } from './error.js';

export function requireApiKey(req: Request, _res: Response, next: NextFunction) {
  const provided = req.header('x-api-key');
  const expected = process.env.API_KEY;
  if (!expected || expected.length === 0) {
    // Misconfiguration
    return next(new HttpError(500, 'Server misconfigured: API key not set', 'CONFIG_ERROR'));
  }
  if (!provided || provided !== expected) {
    return next(new HttpError(401, 'Invalid API key', 'UNAUTHORIZED'));
  }
  next();
}
