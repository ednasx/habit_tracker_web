import amqplib from 'amqplib'

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://rabbitmq:5672'
const HABIT_EXCHANGE = process.env.RABBITMQ_HABIT_EXCHANGE || 'habit.events'
const HABIT_QUEUE = process.env.RABBITMQ_HABIT_QUEUE || 'habit.events.created'

let channelPromise = null

async function getChannel() {
  if (!channelPromise) {
    channelPromise = (async () => {
      const connection = await amqplib.connect(RABBITMQ_URL)
      const channel = await connection.createChannel()

      // Topic exchange for habit events
      await channel.assertExchange(HABIT_EXCHANGE, 'topic', { durable: true })

      // Queue for habit.created events
      await channel.assertQueue(HABIT_QUEUE, { durable: true })
      await channel.bindQueue(HABIT_QUEUE, HABIT_EXCHANGE, 'habit.created')

      console.log('[RabbitMQ] Connected and exchange/queue configured')
      return channel
    })().catch((err) => {
      console.error('[RabbitMQ] Initial RabbitMQ connection failed:', err.message)
      channelPromise = null
      throw err
    })
  }

  return channelPromise
}

/**
 * Publish a habit.created event.
 * This is fire-and-forget: if RabbitMQ is down, we log and continue.
 */
export async function publishHabitCreatedEvent(habit) {
  try {
    const channel = await getChannel()
    const payload = Buffer.from(JSON.stringify(habit))

    channel.publish(HABIT_EXCHANGE, 'habit.created', payload, {
      contentType: 'application/json',
      persistent: true,
    })
  } catch (err) {
    console.error('[RabbitMQ] Failed to publish habit.created event:', err.message)
  }
}
