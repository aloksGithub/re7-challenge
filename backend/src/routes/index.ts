import { Router } from "express";
import tokensRoutes from "./tokens.js";
import transactionsRoutes from "./transactions.js";
import networkRoutes from "./network.js";
import transferRoutes from "./transfer.js";
import adminRoutes from "./admin.js";
import walletRoutes from "./wallet.js";

const router = Router();

router.use(tokensRoutes);
router.use(transactionsRoutes);
router.use(networkRoutes);
router.use(transferRoutes);
router.use(adminRoutes);
router.use(walletRoutes);

export default router;

