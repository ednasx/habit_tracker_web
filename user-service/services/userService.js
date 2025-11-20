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

