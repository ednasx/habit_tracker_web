import amqplib from 'amqplib'
import { 
  rabbitmqMessagesPublished, 
  rabbitmqMessagesFailed,
  rabbitmqChannelClosed 
} from '../monitoring/metrics.js'

const SERVICE_NAME = 'habit-service'

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://rabbitmq:5672'
const EXCHANGE_NAME = process.env.RABBITMQ_HABIT_EXCHANGE || 'habit.events'

let connection = null
let channel = null
let reconnectTimeout = null

async function connectRabbitMQ() {
  // Skip RabbitMQ connection during tests to prevent hanging
  if (process.env.NODE_ENV === 'test') {
    console.log('[RabbitMQ] Skipping connection in test environment')
    return
  }

  // Clean up existing connection if any
  if (connection) {
    try {
      await connection.close()
    } catch (err) {
      // Ignore errors during cleanup
    }
  }

  try {
    connection = await amqplib.connect(RABBITMQ_URL)
    channel = await connection.createChannel()

    // Set up error handlers
    connection.on('error', (err) => {
      console.error('[RabbitMQ] Connection error:', err.message)
      channel = null
      scheduleReconnect()
    })

    connection.on('close', () => {
      console.warn('[RabbitMQ] Connection closed, will attempt to reconnect')
      channel = null
      scheduleReconnect()
    })

    channel.on('error', (err) => {
      console.error('[RabbitMQ] Channel error:', err.message)
      channel = null
    })

    channel.on('close', () => {
      console.warn('[RabbitMQ] Channel closed')
      rabbitmqChannelClosed.inc({ service: SERVICE_NAME })
      channel = null
    })

    await channel.assertExchange(EXCHANGE_NAME, 'topic', {
      durable: true,
    })

    console.log('[RabbitMQ] Connected and exchange asserted:', EXCHANGE_NAME)
  } catch (err) {
    console.error('[RabbitMQ] Initial RabbitMQ connection failed:', err.message)
    connection = null
    channel = null
    scheduleReconnect()
  }
}

function scheduleReconnect() {
  if (reconnectTimeout) return // Already scheduled

  reconnectTimeout = setTimeout(() => {
    reconnectTimeout = null
    console.log('[RabbitMQ] Attempting to reconnect...')
    connectRabbitMQ().catch((err) => {
      console.error('[RabbitMQ] Reconnection failed:', err.message)
    })
  }, 5000) // Retry after 5 seconds
}

// Try to connect on module load (non-fatal if it fails)
connectRabbitMQ().catch((err) => {
  console.error('[RabbitMQ] connectRabbitMQ threw:', err.message)
})

async function ensureChannel() {
  if (!channel || channel.closed) {
    console.log('[RabbitMQ] Channel not available, reconnecting...')
    await connectRabbitMQ()
  }
  return channel
}

export async function publishHabitCreatedEvent(event) {
  if (process.env.NODE_ENV === 'test') return

  const routingKey = 'habit.created'

  try {
    const ch = await ensureChannel()
    if (!ch) {
      console.warn('[RabbitMQ] Channel not ready, cannot publish habit.created event for habitId:', event.habitId)
      rabbitmqMessagesFailed.inc({ 
        exchange: EXCHANGE_NAME, 
        routing_key: routingKey, 
        service: SERVICE_NAME 
      })
      return
    }

    const payload = Buffer.from(JSON.stringify(event))
    const published = ch.publish(EXCHANGE_NAME, routingKey, payload, {
      persistent: true,
    })
    
    if (!published) {
      console.warn('[RabbitMQ] Failed to publish habit.created event (buffer full) for habitId:', event.habitId)
      rabbitmqMessagesFailed.inc({ 
        exchange: EXCHANGE_NAME, 
        routing_key: routingKey, 
        service: SERVICE_NAME 
      })
    } else {
      console.log('[RabbitMQ] Published habit.created event for habitId:', event.habitId)
      rabbitmqMessagesPublished.inc({ 
        exchange: EXCHANGE_NAME, 
        routing_key: routingKey, 
        service: SERVICE_NAME 
      })
    }
  } catch (err) {
    console.error('[RabbitMQ] Failed to publish habit.created event for habitId:', event.habitId, 'Error:', err.message)
    rabbitmqMessagesFailed.inc({ 
      exchange: EXCHANGE_NAME, 
      routing_key: routingKey, 
      service: SERVICE_NAME 
    })
  }
}

export async function publishHabitCompletedEvent(event) {
  if (process.env.NODE_ENV === 'test') return

  const routingKey = 'habit.completed'

  try {
    const ch = await ensureChannel()
    if (!ch) {
      console.warn('[RabbitMQ] Channel not ready, cannot publish habit.completed event for habitId:', event.habitId, 'logId:', event.id)
      rabbitmqMessagesFailed.inc({ 
        exchange: EXCHANGE_NAME, 
        routing_key: routingKey, 
        service: SERVICE_NAME 
      })
      return
    }

    const payload = Buffer.from(JSON.stringify(event))
    const published = ch.publish(EXCHANGE_NAME, routingKey, payload, {
      persistent: true,
    })
    
    if (!published) {
      console.warn('[RabbitMQ] Failed to publish habit.completed event (buffer full) for habitId:', event.habitId, 'logId:', event.id)
      rabbitmqMessagesFailed.inc({ 
        exchange: EXCHANGE_NAME, 
        routing_key: routingKey, 
        service: SERVICE_NAME 
      })
    } else {
      console.log('[RabbitMQ] Published habit.completed event for habitId:', event.habitId, 'logId:', event.id, 'date:', event.date)
      rabbitmqMessagesPublished.inc({ 
        exchange: EXCHANGE_NAME, 
        routing_key: routingKey, 
        service: SERVICE_NAME 
      })
    }
  } catch (err) {
    console.error('[RabbitMQ] Failed to publish habit.completed event for habitId:', event.habitId, 'logId:', event.id, 'Error:', err.message)
    rabbitmqMessagesFailed.inc({ 
      exchange: EXCHANGE_NAME, 
      routing_key: routingKey, 
      service: SERVICE_NAME 
    })
  }
}
