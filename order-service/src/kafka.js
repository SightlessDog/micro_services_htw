const { Kafka } = require('kafkajs');

const kafka = new Kafka({
  clientId: 'order-service',
  brokers: (process.env.KAFKA_BROKERS || 'kafka:9092').split(','),
});

const producer = kafka.producer({
  retry: { retries: 5 },
});

async function connectProducer() {
  await producer.connect();
  console.log('Kafka producer connected');
}

async function publishOrderPlaced(order, userEmail) {
  await producer.send({
    topic: 'order.placed',
    messages: [{
      key: order.id,
      value: JSON.stringify({
        eventType: 'order.placed',
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

async function publishOrderCancelled(order, userEmail) {
  await producer.send({
    topic: 'order.cancelled',
    messages: [{
      key: order.id,
      value: JSON.stringify({
        eventType: 'order.cancelled',
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

module.exports = { connectProducer, publishOrderPlaced, publishOrderCancelled };
