import { NextFunction, Request, RequestHandler, Response } from "express";

export class HttpError extends Error {
  status: number;
  code?: string;
  details?: unknown;

  constructor(status: number, message: string, code?: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function asyncHandler(handler: RequestHandler): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

export function notFound(req: Request, _res: Response, next: NextFunction) {
  next(new HttpError(404, `Not found: ${req.method} ${req.originalUrl}`));
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  const isHttp = err instanceof HttpError;
  const status = isHttp ? err.status : 500;
  const message = isHttp ? err.message : "Internal Server Error";
  const code = isHttp ? err.code : undefined;
  const details = isHttp ? err.details : undefined;

  const payload: Record<string, unknown> = { message };
  if (code) payload.code = code;
  if (details) payload.details = details;

  if (process.env.NODE_ENV !== "production" && !(isHttp && err.details)) {
    // include stack for debugging in non-prod
    payload.stack = (err as any)?.stack;
  }

  res.status(status).json({ error: payload });
}


