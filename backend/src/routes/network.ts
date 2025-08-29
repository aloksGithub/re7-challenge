import { Router, Request, Response } from "express";
import { getSupportedNetworks } from "../config/networks.js";

const router = Router();

router.get("/networks", async (_req: Request, res: Response) => {
  const networks = getSupportedNetworks();
  res.json(networks);
});

export default router;


