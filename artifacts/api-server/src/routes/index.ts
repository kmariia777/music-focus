import { Router, type IRouter } from "express";
import healthRouter from "./health";
import calendarRouter from "./calendar";
import coachRouter from "./coach";

const router: IRouter = Router();

router.use(healthRouter);
router.use(calendarRouter);
router.use(coachRouter);

export default router;
