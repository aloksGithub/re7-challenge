import express, { Request, Response } from "express";
import cors from "cors";
import routes from "./routes/index.js";
import { errorHandler, notFound } from "./middleware/error.js";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/healthz", (_req: Request, res: Response) => {
  res.json({ ok: true });
});

app.use("/", routes);

// 404 and error handling
app.use(notFound);
app.use(errorHandler);

export default app;

