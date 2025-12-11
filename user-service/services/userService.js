import { supabaseAdmin } from '../config/supabaseClient.js'

// Username validation regex: 3-20 chars, lowercase alphanumeric, underscores, hyphens
const USERNAME_REGEX = /^[a-z0-9_-]{3,20}$/

export function validateUsername(username) {
  if (!username || typeof username !== 'string') {
    return { valid: false, error: 'Username is required' }
  }

  const trimmed = username.trim().toLowerCase()

  if (!USERNAME_REGEX.test(trimmed)) {
    return {
      valid: false,
      error: 'Username must be 3-20 characters, lowercase letters, numbers, underscores, or hyphens only',
    }
  }

  return { valid: true, username: trimmed }
}

export async function getUserProfile(userId) {
  // Get user profile with username
  const { data: profile, error } = await supabaseAdmin
    .from('user_profiles')
    .select('user_id, username, display_name, created_at, updated_at')
    .eq('user_id', userId)
    .single()

  if (error) {
    console.error('Error fetching user profile:', error.message)
    return null
  }
  return profile
}

export async function createOrUpdateProfile(userId, { username, display_name }) {
  // Validate username
  const validation = validateUsername(username)
  if (!validation.valid) {
    throw new Error(validation.error)
  }

  const normalizedUsername = validation.username

  // Check if username is already taken by another user
  const { data: existing, error: checkError } = await supabaseAdmin
    .from('user_profiles')
    .select('user_id')
    .eq('username', normalizedUsername)
    .maybeSingle()

  if (checkError) {
    throw new Error(`Failed to check username availability: ${checkError.message}`)
  }

  if (existing && existing.user_id !== userId) {
    throw new Error('Username is already taken')
  }

  // Upsert profile
  const { data, error } = await supabaseAdmin
    .from('user_profiles')
    .upsert(
      {
        user_id: userId,
        username: normalizedUsername,
        display_name: display_name || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    )
    .select('user_id, username, display_name, created_at, updated_at')
    .single()

  if (error) {
    throw new Error(`Failed to save profile: ${error.message}`)
  }

  return data
}

export async function searchUsersByUsername(searchQuery) {
  if (!searchQuery || typeof searchQuery !== 'string') {
    return []
  }

  const trimmed = searchQuery.trim().toLowerCase()
  if (trimmed.length < 2) {
    return []
  }

  // Search for users with username matching the query
  const { data, error } = await supabaseAdmin
    .from('user_profiles')
    .select('user_id, username, display_name')
    .ilike('username', `%${trimmed}%`)
    .limit(20)

  if (error) {
    throw new Error(`Failed to search users: ${error.message}`)
  }

  return data || []
}

export async function getUserByUsername(username) {
  const validation = validateUsername(username)
  if (!validation.valid) {
    throw new Error(validation.error)
  }

  const { data, error } = await supabaseAdmin
    .from('user_profiles')
    .select('user_id, username, display_name')
    .eq('username', validation.username)
    .maybeSingle()

  if (error) {
    throw new Error(`Failed to find user: ${error.message}`)
  }

  if (!data) {
    throw new Error('User not found')
  }

  return data
}

export async function listFriends(userId) {
  // Validate userId is a valid UUID to prevent injection
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!userId || !uuidRegex.test(userId)) {
    throw new Error('Invalid user ID format');
  }

  // Get all accepted friendships (both directions)
  const { data, error } = await supabaseAdmin
    .from('friends')
    .select('friend_id, user_id, status, created_at')
    .eq('status', 'accepted')
    .or(`user_id.eq.${userId},friend_id.eq.${userId}`)

  if (error) {
    throw new Error(error.message)
  }

  // Extract friend IDs (could be in either user_id or friend_id column)
  const friendIds = data.map((row) => {
    return row.user_id === userId ? row.friend_id : row.user_id
  })

  // Fetch friend profiles
  if (friendIds.length === 0) {
    return []
  }

  const { data: profiles, error: profileError } = await supabaseAdmin
    .from('user_profiles')
    .select('user_id, username, display_name')
    .in('user_id', friendIds)

  if (profileError) {
    throw new Error(`Failed to fetch friend profiles: ${profileError.message}`)
  }

  return profiles || []
}

export async function listPendingFriendRequests(userId) {
  // Get pending requests where current user is the recipient (friend_id)
  const { data, error } = await supabaseAdmin
    .from('friends')
    .select('user_id, friend_id, created_at')
    .eq('friend_id', userId)
    .eq('status', 'pending')

  if (error) {
    throw new Error(error.message)
  }

  if (!data || data.length === 0) {
    return []
  }

  // Get profiles of users who sent requests
  const senderIds = data.map((row) => row.user_id)
  const { data: profiles, error: profileError } = await supabaseAdmin
    .from('user_profiles')
    .select('user_id, username, display_name')
    .in('user_id', senderIds)

  if (profileError) {
    throw new Error(`Failed to fetch sender profiles: ${profileError.message}`)
  }

  // Merge with created_at
  return profiles.map((profile) => {
    const request = data.find((r) => r.user_id === profile.user_id)
    return {
      ...profile,
      created_at: request.created_at,
    }
  })
}

export async function listSentFriendRequests(userId) {
  // Get pending requests where current user is the sender (user_id)
  const { data, error } = await supabaseAdmin
    .from('friends')
    .select('user_id, friend_id, status, created_at')
    .eq('user_id', userId)
    .eq('status', 'pending')

  if (error) {
    throw new Error(error.message)
  }

  if (!data || data.length === 0) {
    return []
  }

  // Get profiles of users who received requests
  const recipientIds = data.map((row) => row.friend_id)
  const { data: profiles, error: profileError } = await supabaseAdmin
    .from('user_profiles')
    .select('user_id, username, display_name')
    .in('user_id', recipientIds)

  if (profileError) {
    throw new Error(`Failed to fetch recipient profiles: ${profileError.message}`)
  }

  // Merge with created_at
  return profiles.map((profile) => {
    const request = data.find((r) => r.friend_id === profile.user_id)
    return {
      ...profile,
      created_at: request.created_at,
    }
  })
}

export async function sendFriendRequest(userId, friendId) {
  if (userId === friendId) {
    throw new Error('Cannot add yourself as a friend')
  }

  // Check if friend exists
  const { data: friendProfile, error: friendError } = await supabaseAdmin
    .from('user_profiles')
    .select('user_id')
    .eq('user_id', friendId)
    .maybeSingle()

  if (friendError) {
    throw new Error(`Failed to check friend: ${friendError.message}`)
  }

  if (!friendProfile) {
    throw new Error('User not found')
  }

  // Check if there's already a friendship in either direction
  const { data: existing, error: checkError } = await supabaseAdmin
    .from('friends')
    .select('user_id, friend_id, status')
    .in('user_id', [userId, friendId])
    .in('friend_id', [userId, friendId])
    .maybeSingle()

  if (checkError) {
    throw new Error(`Failed to check existing friendship: ${checkError.message}`)
  }

  if (existing) {
    if (existing.status === 'accepted') {
      throw new Error('You are already friends')
    } else if (existing.status === 'pending') {
      // Check direction
      if (existing.user_id === userId) {
        throw new Error('Friend request already sent')
      } else {
        // They sent us a request, we should accept it instead
        throw new Error('This user has already sent you a friend request. Please accept it instead.')
      }
    } else if (existing.status === 'rejected') {
      // Allow resending after rejection
      const { data: updated, error: updateError } = await supabaseAdmin
        .from('friends')
        .update({ status: 'pending', updated_at: new Date().toISOString() })
        .eq('user_id', existing.user_id)
        .eq('friend_id', existing.friend_id)
        .select('user_id, friend_id, status, created_at')
        .single()

      if (updateError) {
        throw new Error(`Failed to resend friend request: ${updateError.message}`)
      }

      return updated
    }
  }

  // Create new pending friend request
  const { data, error } = await supabaseAdmin
    .from('friends')
    .insert([
      {
        user_id: userId,
        friend_id: friendId,
        status: 'pending',
      },
    ])
    .select('user_id, friend_id, status, created_at')
    .single()

  if (error) {
    throw new Error(`Failed to send friend request: ${error.message}`)
  }

  return data
}

export async function acceptFriendRequest(userId, requesterId) {
  // Find the pending request where requesterId sent to userId
  const { data: request, error: findError } = await supabaseAdmin
    .from('friends')
    .select('user_id, friend_id, status')
    .eq('user_id', requesterId)
    .eq('friend_id', userId)
    .eq('status', 'pending')
    .maybeSingle()

  if (findError) {
    throw new Error(`Failed to find friend request: ${findError.message}`)
  }

  if (!request) {
    throw new Error('Friend request not found or already processed')
  }

  // Update status to accepted
  const { data, error } = await supabaseAdmin
    .from('friends')
    .update({ status: 'accepted', updated_at: new Date().toISOString() })
    .eq('user_id', requesterId)
    .eq('friend_id', userId)
    .select('user_id, friend_id, status, updated_at')
    .single()

  if (error) {
    throw new Error(`Failed to accept friend request: ${error.message}`)
  }

  return data
}

export async function rejectFriendRequest(userId, requesterId) {
  // Find the pending request where requesterId sent to userId
  const { data: request, error: findError } = await supabaseAdmin
    .from('friends')
    .select('user_id, friend_id, status')
    .eq('user_id', requesterId)
    .eq('friend_id', userId)
    .eq('status', 'pending')
    .maybeSingle()

  if (findError) {
    throw new Error(`Failed to find friend request: ${findError.message}`)
  }

  if (!request) {
    throw new Error('Friend request not found or already processed')
  }

  // Update status to rejected (or delete)
  const { data, error } = await supabaseAdmin
    .from('friends')
    .update({ status: 'rejected', updated_at: new Date().toISOString() })
    .eq('user_id', requesterId)
    .eq('friend_id', userId)
    .select('user_id, friend_id, status, updated_at')
    .single()

  if (error) {
    throw new Error(`Failed to reject friend request: ${error.message}`)
  }

  return data
}

export async function removeFriendship(userId, friendId) {
  // Remove friendship in either direction (if accepted)
  const { data, error } = await supabaseAdmin
    .from('friends')
    .delete()
    .in('user_id', [userId, friendId])
    .in('friend_id', [userId, friendId])
    .eq('status', 'accepted')
    .select('user_id, friend_id')

  if (error) {
    throw new Error(`Failed to remove friendship: ${error.message}`)
  }

  if (!data || data.length === 0) {
    throw new Error('Friendship not found')
  }

  return data[0]
}

