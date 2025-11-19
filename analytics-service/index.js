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
  console.error('[Analytics] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function updateStatsFromEvent(event) {
  const { userId, habitId, date } = event
  if (!userId || !habitId || !date) {
    console.warn('[Analytics] Ignoring invalid event payload:', event)
    return
  }

  const eventDate = new Date(date) // expecting YYYY-MM-DD
  const eventDateStr = date // already a date string

  // 1. Get existing stats row
  const { data: stats, error: statsError } = await supabaseAdmin
    .from('habit_stats')
    .select('*')
    .eq('user_id', userId)
    .eq('habit_id', habitId)
    .maybeSingle()

  if (statsError) {
    console.error('[Analytics] Error fetching stats:', statsError.message)
    return
  }

  let total = 1
  let currentStreak = 1
  let longestStreak = 1
  let lastDate = eventDateStr

  if (stats) {
    total = (stats.total_completions || 0) + 1

    const prevDateStr = stats.last_completed_date
    if (prevDateStr) {
      const prevDate = new Date(prevDateStr + 'T00:00:00Z')
      const diffDays =
        (eventDate - prevDate) / (1000 * 60 * 60 * 24)

      if (diffDays === 0) {
        // Same day; don’t change streak
        currentStreak = stats.current_streak || 1
      } else if (diffDays === 1) {
        currentStreak = (stats.current_streak || 0) + 1
      } else {
        currentStreak = 1
      }
    } else {
      currentStreak = 1
    }

    longestStreak = Math.max(
      stats.longest_streak || 0,
      currentStreak
    )
  }

  // 2. Upsert stats row
  const { error: upsertError } = await supabaseAdmin
    .from('habit_stats')
    .upsert(
      {
        user_id: userId,
        habit_id: habitId,
        total_completions: total,
        current_streak: currentStreak,
        longest_streak: longestStreak,
        last_completed_date: lastDate,
      },
      { onConflict: 'habit_id,user_id' }
    )

  if (upsertError) {
    console.error('[Analytics] Error upserting stats:', upsertError.message)
  } else {
    console.log(
      `[Analytics] Updated stats: user=${userId}, habit=${habitId}, total=${total}, streak=${currentStreak}`
    )
  }
}

async function start() {
  console.log('[Analytics] Connecting to RabbitMQ:', RABBITMQ_URL)
  const conn = await amqplib.connect(RABBITMQ_URL)
  const channel = await conn.createChannel()

  await channel.assertExchange(EXCHANGE_NAME, 'topic', {
    durable: true,
  })

  const { queue } = await channel.assertQueue('habit-analytics', {
    durable: true,
  })

  await channel.bindQueue(queue, EXCHANGE_NAME, 'habit.completed')

  channel.consume(
    queue,
    async (msg) => {
      if (!msg) return
      try {
        const content = msg.content.toString()
        const event = JSON.parse(content)
        console.log('[Analytics] Received event:', event)
        await updateStatsFromEvent(event)
        channel.ack(msg)
      } catch (err) {
        console.error('[Analytics] Failed to process message:', err.message)
        // discard bad messages for now
        channel.nack(msg, false, false)
      }
    },
    { noAck: false }
  )

  console.log('[Analytics] Waiting for habit.completed events...')
}

start().catch((err) => {
  console.error('[Analytics] Fatal error:', err.message)
  process.exit(1)
})
