import { supabaseAdmin } from '../config/supabaseClient.js'

export async function getUserProfile(userId) {
  // Try to get from public.users first
  const { data: user, error } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('id', userId)
    .single()

  if (error) {
    console.error('Error fetching user profile:', error.message)
    return null
  }
  return user
}

export async function listFriends(userId) {
  const { data, error } = await supabaseAdmin
    .from('friends')
    .select('friend_id')
    .eq('user_id', userId)

  if (error) {
    throw new Error(error.message)
  }
  return data
}

export async function addFriendship(userId, friendId) {
  if (userId === friendId) {
    throw new Error('Cannot add yourself as a friend')
  }

  const { data, error } = await supabaseAdmin
    .from('friends')
    .insert([
      {
        user_id: userId,
        friend_id: friendId,
      },
    ])
    .select('user_id, friend_id, created_at')
    .single()

  if (error) {
    // Check if friendship already exists (unique constraint violation)
    if (error.code === '23505') {
      throw new Error('Friendship already exists')
    }
    throw new Error(`Failed to add friendship: ${error.message}`)
  }

  return data
}

export async function removeFriendship(userId, friendId) {
  const { data, error } = await supabaseAdmin
    .from('friends')
    .delete()
    .eq('user_id', userId)
    .eq('friend_id', friendId)
    .select('user_id, friend_id')
    .single()

  if (error) {
    throw new Error(`Failed to remove friendship: ${error.message}`)
  }

  if (!data) {
    throw new Error('Friendship not found')
  }

  return data
}

