import 'dotenv/config'
import amqplib from 'amqplib'
import { createClient } from '@supabase/supabase-js'

const RABBITMQ_URL =
  process.env.RABBITMQ_URL || 'amqp://rabbitmq:5672'
const EXCHANGE_NAME =
  process.env.RABBITMQ_HABIT_EXCHANGE || 'habit.events'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('[Analytics] Missing Supabase env vars')
  process.exit(1)
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function updateStats(event) {
  const { userId, habitId, date } = event
  if (!userId || !habitId || !date) {
    console.warn('[Analytics] Invalid event payload:', event)
    return
  }

  const eventDate = new Date(date)

  // 1) fetch current stats
  const { data: stats, error } = await supabaseAdmin
    .from('habit_stats')
    .select('*')
    .eq('user_id', userId)
    .eq('habit_id', habitId)
    .maybeSingle()

  if (error) {
    console.error('[Analytics] fetch error:', error.message)
    return
  }

  let total = 1
  let currentStreak = 1
  let longestStreak = 1
  let lastCompletedDate = eventDate.toISOString().slice(0, 10)

  if (stats) {
    total = stats.total_completions + 1

    const prevDate = stats.last_completed_date
      ? new Date(stats.last_completed_date + 'T00:00:00Z')
      : null

    if (prevDate) {
      const diffDays =
        (eventDate - prevDate) / (1000 * 60 * 60 * 24)

      if (diffDays === 0) {
        // same day -> don’t change streak
        currentStreak = stats.current_streak
      } else if (diffDays === 1) {
        currentStreak = stats.current_streak + 1
      } else {
        currentStreak = 1
      }
    }

    longestStreak = Math.max(
      stats.longest_streak || 0,
      currentStreak
    )
  }

  const { error: upsertError } = await supabaseAdmin
    .from('habit_stats')
    .upsert(
      {
        user_id: userId,
        habit_id: habitId,
        total_completions: total,
        current_streak: currentStreak,
        longest_streak: longestStreak,
        last_completed_date: lastCompletedDate,
      },
      { onConflict: 'habit_id,user_id' }
    )

  if (upsertError) {
    console.error('[Analytics] upsert error:', upsertError.message)
  }
}

async function start() {
  console.log('[Analytics] Connecting to RabbitMQ at', RABBITMQ_URL)
  const conn = await amqplib.connect(RABBITMQ_URL)
  const channel = await conn.createChannel()

  await channel.assertExchange(EXCHANGE_NAME, 'topic', { durable: true })

  const { queue } = await channel.assertQueue('habit-analytics', {
    durable: true,
  })

  await channel.bindQueue(queue, EXCHANGE_NAME, 'habit.completed')

  channel.consume(
    queue,
    async (msg) => {
      if (!msg) return
      try {
        const event = JSON.parse(msg.content.toString())
        console.log('[Analytics] Event received:', event)
        await updateStats(event)
        channel.ack(msg)
      } catch (err) {
        console.error('[Analytics] Failed to handle message:', err)
        channel.nack(msg, false, false) // discard bad messages
      }
    },
    { noAck: false }
  )

  console.log('[Analytics] Waiting for habit.completed events...')
}

start().catch((err) => {
  console.error('[Analytics] Fatal error:', err)
  process.exit(1)
})
