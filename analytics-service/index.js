import 'dotenv/config'
import amqplib from 'amqplib'
import { handleHabitCompleted } from './handlers/habitStatsHandler.js'
import { handleFriendshipChanged } from './handlers/friendshipHandler.js'

const RABBITMQ_URL =
  process.env.RABBITMQ_URL || 'amqp://rabbitmq:5672'
const EXCHANGE_NAME =
  process.env.RABBITMQ_HABIT_EXCHANGE || 'habit.events'

async function start() {
  console.log('[Analytics] Connecting to RabbitMQ:', RABBITMQ_URL)
  const conn = await amqplib.connect(RABBITMQ_URL)
  const channel = await conn.createChannel()

  await channel.assertExchange(EXCHANGE_NAME, 'topic', {
    durable: true,
  })

  // Queue for habit completion events
  const habitQueue = await channel.assertQueue('habit-analytics', {
    durable: true,
  })
  await channel.bindQueue(habitQueue.queue, EXCHANGE_NAME, 'habit.completed')

  // Queue for friendship change events
  const friendshipQueue = await channel.assertQueue('friendship-analytics', {
    durable: true,
  })
  await channel.bindQueue(
    friendshipQueue.queue,
    EXCHANGE_NAME,
    'user.friendship.changed'
  )

  // Consume habit.completed events
  channel.consume(
    habitQueue.queue,
    async (msg) => {
      if (!msg) return
      try {
        const content = msg.content.toString()
        const event = JSON.parse(content)
        console.log('[Analytics] Received habit.completed event:', event)
        await handleHabitCompleted(event)
        channel.ack(msg)
      } catch (err) {
        console.error('[Analytics] Failed to process habit.completed:', err.message)
        // discard bad messages for now
        channel.nack(msg, false, false)
      }
    },
    { noAck: false }
  )

  // Consume user.friendship.changed events
  channel.consume(
    friendshipQueue.queue,
    async (msg) => {
      if (!msg) return
      try {
        const content = msg.content.toString()
        const event = JSON.parse(content)
        console.log('[Analytics] Received user.friendship.changed event:', event)
        await handleFriendshipChanged(event)
        channel.ack(msg)
      } catch (err) {
        console.error('[Analytics] Failed to process user.friendship.changed:', err.message)
        // discard bad messages for now
        channel.nack(msg, false, false)
      }
    },
    { noAck: false }
  )

  console.log('[Analytics] Waiting for events...')
  console.log('  - habit.completed')
  console.log('  - user.friendship.changed')
}

start().catch((err) => {
  console.error('[Analytics] Fatal error:', err.message)
  process.exit(1)
})
