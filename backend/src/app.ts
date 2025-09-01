import express, { Request, Response } from 'express';
import cors from 'cors';
import routes from './routes/index.js';
import { errorHandler, notFound } from './middleware/error.js';

const app = express();

// Tightened CORS: allow only configured origin(s)
const corsOrigins = (process.env.CORS_ALLOWED_ORIGINS || 'http://localhost:3000')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true); // allow server-to-server and curl
      if (corsOrigins.includes(origin)) return cb(null, true);
      cb(new Error('CORS origin not allowed'));
    },
    credentials: false,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'x-api-key'],
  }),
);
app.use(express.json());

app.get('/healthz', (_req: Request, res: Response) => {
  res.json({ ok: true });
});

app.use('/', routes);

// 404 and error handling
app.use(notFound);
app.use(errorHandler);

export default app;
