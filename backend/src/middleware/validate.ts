import { NextFunction, Request, Response } from 'express';
import type { ZodSchema, ZodTypeAny } from 'zod';
import { HttpError } from './error.js';

type Source = 'body' | 'params' | 'query';

export function validate(schema: ZodSchema<any>, source: Source = 'body') {
  return (req: Request, _res: Response, next: NextFunction) => {
    const data = (req as any)[source];
    const result = (schema as ZodTypeAny).safeParse(data);
    if (!result.success) {
      const details = result.error.flatten();
      return next(new HttpError(400, 'Invalid request', 'VALIDATION_ERROR', details));
    }
    (req as any)[source] = result.data;
    next();
  };
}
