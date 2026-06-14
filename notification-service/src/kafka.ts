import { Kafka } from "kafkajs";
import { logger } from "./logger";
import { sendMail } from "./mailer";
import { renderOrderCancelled, renderOrderPlaced } from "./templates";
import type { OrderEvent } from "./types";
import { parseOrderEvent } from "./validation";

const kafka = new Kafka({
  clientId: "notification-service",
  brokers: (process.env.KAFKA_BROKERS || "kafka:9092").split(","),
});

const consumer = kafka.consumer({ groupId: "notification-service" });

const SEND_RETRIES = 3;
const SEND_RETRY_DELAY_MS = 1_000;

function errorFields(err: unknown): Record<string, unknown> {
  return err instanceof Error ? { error: err.message, stack: err.stack } : { error: String(err) };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function sendMailWithRetry(to: string, subject: string, text: string, html: string): Promise<void> {
  for (let attempt = 1; attempt <= SEND_RETRIES; attempt++) {
    try {
      await sendMail(to, subject, text, html);
      return;
    } catch (err: unknown) {
      if (attempt === SEND_RETRIES) throw err;
      logger.warn("sendMail failed, retrying", { to, attempt, ...errorFields(err) });
      await sleep(SEND_RETRY_DELAY_MS * attempt);
    }
  }
}

async function handleEvent(event: OrderEvent): Promise<void> {
  if (!event.userEmail) {
    logger.info("Skipping event: no user email", { eventType: event.eventType, orderId: event.orderId });
    return;
  }

  const content = event.eventType === "order.placed" ? renderOrderPlaced(event) : renderOrderCancelled(event);

  try {
    await sendMailWithRetry(event.userEmail, content.subject, content.text, content.html);
    logger.info("Sent order event email", { eventType: event.eventType, orderId: event.orderId, to: event.userEmail });
  } catch (err: unknown) {
    // All retries exhausted — log full event for manual recovery rather than throwing,
    // which would otherwise stall the consumer on a persistently-down SMTP server.
    logger.error("Failed to send order event email after retries", {
      eventType: event.eventType,
      orderId: event.orderId,
      event,
      ...errorFields(err),
    });
  }
}

export async function startConsumer(): Promise<void> {
  await consumer.connect();
  await consumer.subscribe({ topics: ["order.placed", "order.cancelled"], fromBeginning: false });

  await consumer.run({
    eachMessage: async ({ message }) => {
      if (!message.value) return;

      let raw: unknown;
      try {
        raw = JSON.parse(message.value.toString());
      } catch (err: unknown) {
        logger.error("Failed to parse order event JSON", { raw: message.value.toString(), ...errorFields(err) });
        return;
      }

      const event = parseOrderEvent(raw);
      if (!event) {
        logger.error("Dropping malformed order event", { raw });
        return;
      }

      await handleEvent(event);
    },
  });

  logger.info("Kafka consumer running, subscribed to order.placed, order.cancelled");
}
