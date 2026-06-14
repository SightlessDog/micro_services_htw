import express, { type Request, type Response } from "express";
import { startConsumer } from "./kafka";
import { logger } from "./logger";
import { verifyMailer } from "./mailer";

const app = express();
const PORT = process.env.PORT || 3001;

app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", service: "notification-service" });
});

Promise.all([verifyMailer(), startConsumer()])
  .then(() => {
    app.listen(PORT, () => {
      logger.info(`Notification service running on port ${PORT}`);
    });
  })
  .catch((err: Error) => {
    logger.error("Startup failed", { error: err.message, stack: err.stack });
    process.exit(1);
  });
