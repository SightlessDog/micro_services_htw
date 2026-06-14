import express, { type Request, type Response, type NextFunction } from "express";
import ordersRouter from "./routes/orders";
import { connectProducer, disconnectProducer } from "./kafka";
import { prisma } from "./db";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", service: "order-service" });
});

app.use("/orders", ordersRouter);

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: "Internal server error" });
});

connectProducer()
  .then(() => {
    const server = app.listen(PORT, () => {
      console.log(`Order service running on port ${PORT}`);
    });

    const shutdown = async (signal: string): Promise<void> => {
      console.log(`${signal} received, shutting down`);
      server.close();
      await Promise.allSettled([disconnectProducer(), prisma.$disconnect()]);
      process.exit(0);
    };

    process.on("SIGTERM", () => void shutdown("SIGTERM"));
    process.on("SIGINT", () => void shutdown("SIGINT"));
  })
  .catch((err: Error) => {
    console.error("Startup failed:", err);
    process.exit(1);
  });
