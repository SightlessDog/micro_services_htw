import { Kafka } from "kafkajs";
import type { Order } from "@prisma/client";

// KAFKA_SASL_USERNAME present = Upstash (cloud); absent = plain Kafka (local dev)
const kafka = new Kafka({
  clientId: "order-service",
  brokers: (process.env.KAFKA_BROKERS || "kafka:9092").split(","),
  ...(process.env.KAFKA_SASL_USERNAME && {
    ssl: true,
    sasl: {
      mechanism: "scram-sha-256" as const,
      username: process.env.KAFKA_SASL_USERNAME,
      password: process.env.KAFKA_SASL_PASSWORD!,
    },
  }),
});

const producer = kafka.producer({
  retry: { retries: 5 },
});

export async function connectProducer(): Promise<void> {
  await producer.connect();
  console.log("Kafka producer connected");
}

export async function disconnectProducer(): Promise<void> {
  await producer.disconnect();
  console.log("Kafka producer disconnected");
}

export async function publishOrderPlaced(order: Order, userEmail?: string): Promise<void> {
  await producer.send({
    topic: "order.placed",
    messages: [{
      key: order.id,
      value: JSON.stringify({
        eventType: "order.placed",
        orderId: order.id,
        userId: order.userId,
        userEmail,
        items: order.items,
        total: order.total,
        createdAt: order.createdAt,
      }),
    }],
  });
}

export async function publishOrderCancelled(order: Order, userEmail?: string): Promise<void> {
  await producer.send({
    topic: "order.cancelled",
    messages: [{
      key: order.id,
      value: JSON.stringify({
        eventType: "order.cancelled",
        orderId: order.id,
        userId: order.userId,
        userEmail,
        items: order.items,
        total: order.total,
        cancelledAt: new Date().toISOString(),
      }),
    }],
  });
}
