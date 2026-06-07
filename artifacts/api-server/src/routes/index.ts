import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import productsRouter from "./products.js";
import ordersRouter from "./orders.js";
import customersRouter from "./customers.js";
import marketingRouter from "./marketing.js";
import analyticsRouter from "./analytics.js";
import cartRouter from "./cart.js";
import specialCollectionsRouter from "./specialCollections.js";
import authRouter from "./auth.js";
import bannersRouter from "./banners.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(productsRouter);
router.use(ordersRouter);
router.use(customersRouter);
router.use(marketingRouter);
router.use(analyticsRouter);
router.use(cartRouter);
router.use(specialCollectionsRouter);
router.use(authRouter);
router.use(bannersRouter);

export default router;
