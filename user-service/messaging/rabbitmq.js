import amqplib from 'amqplib'

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://rabbitmq:5672'
const EXCHANGE_NAME = process.env.RABBITMQ_HABIT_EXCHANGE || 'habit.events'

let connection = null
let channel = null

async function connectRabbitMQ() {
  // Skip RabbitMQ connection during tests to prevent hanging
  if (process.env.NODE_ENV === 'test') {
    console.log('[RabbitMQ] Skipping connection in test environment')
    return
  }

  try {
    connection = await amqplib.connect(RABBITMQ_URL)
    channel = await connection.createChannel()

    await channel.assertExchange(EXCHANGE_NAME, 'topic', {
      durable: true,
    })

    console.log('[RabbitMQ] Connected and exchange asserted:', EXCHANGE_NAME)
  } catch (err) {
    console.error('[RabbitMQ] Initial RabbitMQ connection failed:', err.message)
    connection = null
    channel = null
  }
}

// Try to connect on module load (non-fatal if it fails)
connectRabbitMQ().catch((err) => {
  console.error('[RabbitMQ] connectRabbitMQ threw:', err.message)
})

export async function publishHabitCreatedEvent(event) {
  if (process.env.NODE_ENV === 'test') return

  if (!channel) {
    console.warn('[RabbitMQ] Channel not ready, cannot publish habit.created event')
    return
  }

  try {
    const payload = Buffer.from(JSON.stringify(event))
    await channel.publish(EXCHANGE_NAME, 'habit.created', payload, {
      persistent: true,
    })
  } catch (err) {
    console.error('[RabbitMQ] Failed to publish habit.created event:', err.message)
  }
}

export async function publishHabitCompletedEvent(event) {
  if (process.env.NODE_ENV === 'test') return

  if (!channel) {
    console.warn('[RabbitMQ] Channel not ready, cannot publish habit.completed event')
    return
  }

  try {
    const payload = Buffer.from(JSON.stringify(event))
    await channel.publish(EXCHANGE_NAME, 'habit.completed', payload, {
      persistent: true,
    })
  } catch (err) {
    console.error('[RabbitMQ] Failed to publish habit.completed event:', err.message)
  }
}

export async function publishFriendshipChangedEvent(event) {
  if (process.env.NODE_ENV === 'test') return

  if (!channel) {
    console.warn('[RabbitMQ] Channel not ready, cannot publish user.friendship.changed event')
    return
  }

  try {
    const payload = Buffer.from(JSON.stringify(event))
    await channel.publish(EXCHANGE_NAME, 'user.friendship.changed', payload, {
      persistent: true,
    })
  } catch (err) {
    console.error('[RabbitMQ] Failed to publish user.friendship.changed event:', err.message)
  }
}
