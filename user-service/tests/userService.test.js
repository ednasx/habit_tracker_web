import { test, mock } from 'node:test'
import assert from 'node:assert/strict'

// Test UUIDs
const USER_1 = '123e4567-e89b-12d3-a456-426614174000'
const USER_2 = '223e4567-e89b-12d3-a456-426614174001'
const USER_3 = '323e4567-e89b-12d3-a456-426614174002'

/**
 * Helper to import userService and patch supabaseAdmin.from
 * so we don't talk to a real Supabase instance.
 */
async function setupUserServiceMock({
  // getUserProfile
  profileData = null,
  profileError = false,
  
  // createOrUpdateProfile
  existingUsernameCheck = undefined, // undefined means not set, null means explicitly set to null
  usernameCheckError = false,
  upsertError = false,
  upsertData = null,
  
  // searchUsersByUsername
  searchResults = [],
  searchError = false,
  
  // getUserByUsername
  userByUsernameData = null,
  userByUsernameError = false,
  
  // listFriends
  friendsList = [],
  friendsError = false,
  friendProfiles = [],
  friendProfilesError = false,
  
  // listPendingFriendRequests
  pendingRequests = [],
  pendingRequestsError = false,
  pendingSenderProfiles = [],
  pendingSenderProfilesError = false,
  
  // listSentFriendRequests
  sentRequests = [],
  sentRequestsError = false,
  sentRecipientProfiles = [],
  sentRecipientProfilesError = false,
  
  // sendFriendRequest
  friendProfileCheck = null,
  friendProfileCheckError = false,
  existingFriendship = null,
  existingFriendshipError = false,
  insertFriendshipError = false,
  updateFriendshipError = false,
  
  // acceptFriendRequest / rejectFriendRequest
  requestFindError = false,
  requestData = undefined, // undefined means use default (found), null means not found, object means use that object
  requestUpdateError = false,
  
  // removeFriendship
  deleteFriendshipError = false,
  deleteFriendshipResult = null,
} = {}) {
  // Ensure env vars are present so supabaseAdmin is created
  process.env.SUPABASE_URL = 'https://example.test'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'dummy-key'

  // Import the real supabaseAdmin instance and the service under test
  const { supabaseAdmin } = await import('../config/supabaseClient.js')
  const userService = await import('../services/userService.js')

  // Track query state for complex chains
  let queryState = {
    table: null,
    isSelect: false,
    isDelete: false,
    isUpdate: false,
    isUpsert: false,
    isInsert: false,
    fields: [],
    eqFields: [],
    inFields: [],
    orClause: null,
  }

  // Mock only the "from" method on the existing supabaseAdmin
  mock.method(supabaseAdmin, 'from', (table) => {
    queryState = {
      table,
      isSelect: false,
      isDelete: false,
      isUpdate: false,
      isUpsert: false,
      isInsert: false,
      fields: [],
      eqFields: [],
      inFields: [],
      orClause: null,
    }

    if (table === 'user_profiles') {
      return {
        select(fields) {
          queryState.isSelect = true
          queryState.fields = fields
          return this
        },
        eq(field, value) {
          queryState.eqFields.push({ field, value })
          return this
        },
        single() {
          // getUserProfile: .select().eq('user_id').single()
          if (queryState.isSelect && queryState.eqFields.length === 1 && queryState.eqFields[0].field === 'user_id') {
            if (profileError) {
              return Promise.resolve({
                data: null,
                error: new Error('Database query failed'),
              })
            }
            return Promise.resolve({
              data: profileData,
              error: profileData ? null : { code: 'PGRST116', message: 'No rows found' },
            })
          }
          return Promise.resolve({ data: null, error: null })
        },
        maybeSingle() {
          // getUserByUsername or createOrUpdateProfile username check: .select().eq('username').maybeSingle()
          if (queryState.isSelect && queryState.eqFields.length === 1 && queryState.eqFields[0].field === 'username' && !queryState.isUpsert) {
            // Check if this is for createOrUpdateProfile username check (existingUsernameCheck was explicitly provided)
            if (existingUsernameCheck !== undefined) {
              if (usernameCheckError) {
                return Promise.resolve({
                  data: null,
                  error: new Error('Database query failed'),
                })
              }
              return Promise.resolve({
                data: existingUsernameCheck,
                error: null,
              })
            }
            // Otherwise it's getUserByUsername
            if (userByUsernameError) {
              return Promise.resolve({
                data: null,
                error: new Error('Database query failed'),
              })
            }
            return Promise.resolve({
              data: userByUsernameData,
              error: null,
            })
          }
          
          // sendFriendRequest friend check: .select().eq('user_id').maybeSingle()
          if (queryState.isSelect && queryState.eqFields.length === 1 && queryState.eqFields[0].field === 'user_id' && friendProfileCheck !== undefined) {
            if (friendProfileCheckError) {
              return Promise.resolve({
                data: null,
                error: new Error('Database query failed'),
              })
            }
            return Promise.resolve({
              data: friendProfileCheck,
              error: null,
            })
          }
          
          return Promise.resolve({ data: null, error: null })
        },
        ilike(field, pattern) {
          // searchUsersByUsername: .select().ilike('username').limit()
          if (queryState.isSelect && field === 'username') {
            if (searchError) {
              return {
                limit() {
                  return Promise.resolve({
                    data: null,
                    error: new Error('Search failed'),
                  })
                },
              }
            }
            return {
              limit() {
                return Promise.resolve({
                  data: searchResults,
                  error: null,
                })
              },
            }
          }
          return this
        },
        in(field, values) {
          queryState.inFields.push({ field, values })
          
          // For user_profiles, we need to distinguish between different contexts
          // We'll use a simple heuristic: check the values array length and content
          // This is not perfect but works for our test cases
          if (queryState.isSelect && field === 'user_id' && queryState.inFields.length === 1) {
            // Try to match based on which profiles array is configured
            // Priority: friendProfiles > pendingSenderProfiles > sentRecipientProfiles
            if (friendProfiles !== undefined && friendProfiles.length > 0) {
              if (friendProfilesError) {
                return Promise.resolve({
                  data: null,
                  error: new Error('Failed to fetch friend profiles'),
                })
              }
              return Promise.resolve({
                data: friendProfiles,
                error: null,
              })
            }
            
            if (pendingSenderProfiles !== undefined && pendingSenderProfiles.length > 0) {
              if (pendingSenderProfilesError) {
                return Promise.resolve({
                  data: null,
                  error: new Error('Failed to fetch sender profiles'),
                })
              }
              return Promise.resolve({
                data: pendingSenderProfiles,
                error: null,
              })
            }
            
            if (sentRecipientProfiles !== undefined && sentRecipientProfiles.length > 0) {
              if (sentRecipientProfilesError) {
                return Promise.resolve({
                  data: null,
                  error: new Error('Failed to fetch recipient profiles'),
                })
              }
              return Promise.resolve({
                data: sentRecipientProfiles,
                error: null,
              })
            }
            
            // Default: return empty array or configured data
            if (friendProfilesError) {
              return Promise.resolve({
                data: null,
                error: new Error('Failed to fetch friend profiles'),
              })
            }
            if (pendingSenderProfilesError) {
              return Promise.resolve({
                data: null,
                error: new Error('Failed to fetch sender profiles'),
              })
            }
            if (sentRecipientProfilesError) {
              return Promise.resolve({
                data: null,
                error: new Error('Failed to fetch recipient profiles'),
              })
            }
            
            // Return the first non-error configured array, or empty
            return Promise.resolve({
              data: friendProfiles || pendingSenderProfiles || sentRecipientProfiles || [],
              error: null,
            })
          }
          
          return this
        },
        upsert(data, options) {
          queryState.isUpsert = true
          
          if (upsertError) {
            return {
              select() {
                return this
              },
              single() {
                return Promise.resolve({
                  data: null,
                  error: new Error('Upsert failed'),
                })
              },
            }
          }
          
          return {
            select() {
              return this
            },
            single() {
              return Promise.resolve({
                data: upsertData || {
                  user_id: data.user_id,
                  username: data.username,
                  display_name: data.display_name,
                  created_at: '2025-01-01T00:00:00Z',
                  updated_at: data.updated_at,
                },
                error: null,
              })
            },
          }
        },
      }
    }

    if (table === 'friends') {
      // Helper to create a chainable object with maybeSingle for accept/reject friend request
      const createSelectEqChain = () => ({
        eq(field, value) {
          queryState.eqFields.push({ field, value })
          // After any eq, return this same object to allow more chaining
          return this
        },
        maybeSingle() {
          // acceptFriendRequest / rejectFriendRequest: .select().eq('user_id').eq('friend_id').eq('status').maybeSingle()
          if (queryState.isSelect && queryState.eqFields.length === 3) {
            const [eq1, eq2, eq3] = queryState.eqFields
            if (eq1.field === 'user_id' && eq2.field === 'friend_id' && eq3.field === 'status' && eq3.value === 'pending') {
              if (requestFindError) {
                return Promise.resolve({
                  data: null,
                  error: new Error('Database query failed'),
                })
              }
              return Promise.resolve({
                data: requestData !== undefined ? requestData : { user_id: eq1.value, friend_id: eq2.value, status: 'pending' },
                error: null,
              })
            }
          }
          return Promise.resolve({ data: null, error: null })
        },
      })

      return {
        select(fields) {
          queryState.isSelect = true
          queryState.fields = fields
          return this
        },
        eq(field, value) {
          queryState.eqFields.push({ field, value })
          
          // listPendingFriendRequests: .select().eq('friend_id').eq('status', 'pending') - returns Promise
          if (queryState.isSelect && field === 'friend_id' && queryState.eqFields.length === 1) {
            return {
              eq(field2, value2) {
                queryState.eqFields.push({ field: field2, value: value2 })
                if (field2 === 'status' && value2 === 'pending') {
                  if (pendingRequestsError) {
                    return Promise.resolve({
                      data: null,
                      error: new Error('Database query failed'),
                    })
                  }
                  return Promise.resolve({
                    data: pendingRequests,
                    error: null,
                  })
                }
                return this
              },
            }
          }
          
          // listSentFriendRequests vs acceptFriendRequest/rejectFriendRequest
          // Both start with .select().eq('user_id', ...) but differ in second eq:
          // - listSentFriendRequests: .eq('user_id').eq('status', 'pending') -> returns Promise
          // - accept/reject: .eq('user_id').eq('friend_id').eq('status').maybeSingle() -> needs more chaining
          if (queryState.isSelect && field === 'user_id' && queryState.eqFields.length === 1) {
            return {
              eq(field2, value2) {
                queryState.eqFields.push({ field: field2, value: value2 })
                // listSentFriendRequests: second eq is 'status'
                if (field2 === 'status' && value2 === 'pending') {
                  if (sentRequestsError) {
                    return Promise.resolve({
                      data: null,
                      error: new Error('Database query failed'),
                    })
                  }
                  return Promise.resolve({
                    data: sentRequests,
                    error: null,
                  })
                }
                // acceptFriendRequest/rejectFriendRequest: second eq is 'friend_id'
                // Need to return object with eq AND maybeSingle for more chaining
                if (field2 === 'friend_id') {
                  return createSelectEqChain()
                }
                return this
              },
            }
          }
          
          // update().eq().eq() for accept/reject
          if (queryState.isUpdate && queryState.eqFields.length === 1) {
            return {
              eq(field2, value2) {
                queryState.eqFields.push({ field: field2, value: value2 })
                return {
                  select() {
                    return this
                  },
                  single() {
                    if (requestUpdateError) {
                      return Promise.resolve({
                        data: null,
                        error: new Error('Update failed'),
                      })
                    }
                    return Promise.resolve({
                      data: {
                        user_id: value,
                        friend_id: value2,
                        status: 'accepted',
                        updated_at: new Date().toISOString(),
                      },
                      error: null,
                    })
                  },
                }
              },
            }
          }
          
          // delete().in().in().eq('status', 'accepted').select()
          if (queryState.isDelete && queryState.inFields.length === 2) {
            // We're in the eq call after two in() calls
            if (field === 'status' && value === 'accepted') {
              return {
                select() {
                  if (deleteFriendshipError) {
                    return Promise.resolve({
                      data: null,
                      error: new Error('Delete failed'),
                    })
                  }
                  return Promise.resolve({
                    data: deleteFriendshipResult || [{ user_id: USER_1, friend_id: USER_2 }],
                    error: null,
                  })
                },
              }
            }
          }
          
          return this
        },
        maybeSingle() {
          // acceptFriendRequest / rejectFriendRequest: .select().eq('user_id').eq('friend_id').eq('status').maybeSingle()
          if (queryState.isSelect && queryState.eqFields.length === 3) {
            const [eq1, eq2, eq3] = queryState.eqFields
            if (eq1.field === 'user_id' && eq2.field === 'friend_id' && eq3.field === 'status' && eq3.value === 'pending') {
              if (requestFindError) {
                return Promise.resolve({
                  data: null,
                  error: new Error('Database query failed'),
                })
              }
              return Promise.resolve({
                data: requestData !== undefined ? requestData : { user_id: eq1.value, friend_id: eq2.value, status: 'pending' },
                error: null,
              })
            }
          }
          
          // sendFriendRequest existing check: .select().in('user_id').in('friend_id').maybeSingle()
          if (queryState.isSelect && queryState.inFields.length === 2) {
            if (existingFriendshipError) {
              return Promise.resolve({
                data: null,
                error: new Error('Database query failed'),
              })
            }
            return Promise.resolve({
              data: existingFriendship,
              error: null,
            })
          }
          
          return Promise.resolve({ data: null, error: null })
        },
        single() {
          // update().eq().eq().select().single() for accept/reject
          if (queryState.isUpdate && queryState.eqFields.length === 2) {
            if (requestUpdateError) {
              return Promise.resolve({
                data: null,
                error: new Error('Update failed'),
              })
            }
            return Promise.resolve({
              data: {
                user_id: queryState.eqFields[0].value,
                friend_id: queryState.eqFields[1].value,
                status: 'accepted',
                updated_at: new Date().toISOString(),
              },
              error: null,
            })
          }
          return Promise.resolve({ data: null, error: null })
        },
        or(clause) {
          queryState.orClause = clause
          // listFriends: .select().eq('status').or()
          if (queryState.isSelect && queryState.eqFields.length === 1 && queryState.eqFields[0].field === 'status') {
            if (friendsError) {
              return Promise.resolve({
                data: null,
                error: new Error('Database query failed'),
              })
            }
            return Promise.resolve({
              data: friendsList,
              error: null,
            })
          }
          return Promise.resolve({ data: [], error: null })
        },
        in(field, values) {
          queryState.inFields.push({ field, values })
          return this
        },
        insert(data) {
          queryState.isInsert = true
          
          if (insertFriendshipError) {
            return {
              select() {
                return this
              },
              single() {
                return Promise.resolve({
                  data: null,
                  error: new Error('Insert failed'),
                })
              },
            }
          }
          
          return {
            select() {
              return this
            },
            single() {
              return Promise.resolve({
                data: {
                  user_id: data[0].user_id,
                  friend_id: data[0].friend_id,
                  status: data[0].status,
                  created_at: new Date().toISOString(),
                },
                error: null,
              })
            },
          }
        },
        update(updateData) {
          queryState.isUpdate = true
          queryState.updateData = updateData
          
          // All update patterns: .update().eq().eq().select().single()
          // - sendFriendRequest resend: status: 'pending'
          // - acceptFriendRequest: status: 'accepted'
          // - rejectFriendRequest: status: 'rejected'
          
          // Handle error cases
          if ((updateData.status === 'pending' && updateFriendshipError) ||
              (updateData.status !== 'pending' && requestUpdateError)) {
            return {
              eq() {
                return this
              },
              select() {
                return this
              },
              single() {
                return Promise.resolve({
                  data: null,
                  error: new Error('Update failed'),
                })
              },
            }
          }
          
          return {
            eq(field, value) {
              queryState.eqFields.push({ field, value })
              return {
                eq(field2, value2) {
                  queryState.eqFields.push({ field: field2, value: value2 })
                  return {
                    select() {
                      return this
                    },
                    single() {
                      return Promise.resolve({
                        data: {
                          user_id: value,
                          friend_id: value2,
                          status: updateData.status,
                          updated_at: updateData.updated_at || new Date().toISOString(),
                          created_at: new Date().toISOString(),
                        },
                        error: null,
                      })
                    },
                  }
                },
              }
            },
          }
        },
        delete() {
          queryState.isDelete = true
          return this
        },
      }
    }

    throw new Error(`Unexpected table: ${table}`)
  })

  return { userService }
}

// ============================================================================
// Happy Path Tests
// ============================================================================

test('getUserProfile returns profile when exists', async () => {
  const profile = {
    user_id: USER_1,
    username: 'testuser',
    display_name: 'Test User',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  }

  const { userService } = await setupUserServiceMock({
    profileData: profile,
  })

  const result = await userService.getUserProfile(USER_1)
  assert.deepEqual(result, profile)
})

test('getUserProfile returns null when profile not found', async () => {
  const { userService } = await setupUserServiceMock({
    profileData: null,
  })

  const result = await userService.getUserProfile(USER_1)
  assert.equal(result, null)
})

test('createOrUpdateProfile creates new profile', async () => {
  const { userService } = await setupUserServiceMock({
    existingUsernameCheck: null, // Explicitly set to null (username not taken)
    upsertData: {
      user_id: USER_1,
      username: 'newuser',
      display_name: 'New User',
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
    },
  })

  const result = await userService.createOrUpdateProfile(USER_1, {
    username: 'newuser',
    display_name: 'New User',
  })

  assert.equal(result.username, 'newuser')
  assert.equal(result.display_name, 'New User')
})

test('createOrUpdateProfile updates existing profile', async () => {
  const { userService } = await setupUserServiceMock({
    existingUsernameCheck: { user_id: USER_1 }, // Same user, username available
    upsertData: {
      user_id: USER_1,
      username: 'updateduser',
      display_name: 'Updated User',
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-02T00:00:00Z',
    },
  })

  const result = await userService.createOrUpdateProfile(USER_1, {
    username: 'updateduser',
    display_name: 'Updated User',
  })

  assert.equal(result.username, 'updateduser')
})

test('searchUsersByUsername returns matching users', async () => {
  const searchResults = [
    { user_id: USER_1, username: 'testuser', display_name: 'Test' },
    { user_id: USER_2, username: 'testuser2', display_name: 'Test 2' },
  ]

  const { userService } = await setupUserServiceMock({
    searchResults,
  })

  const result = await userService.searchUsersByUsername('test')
  assert.equal(result.length, 2)
  assert.equal(result[0].username, 'testuser')
})

test('searchUsersByUsername returns empty array for short query', async () => {
  const { userService } = await setupUserServiceMock()

  const result = await userService.searchUsersByUsername('a')
  assert.equal(result.length, 0)
})

test('searchUsersByUsername returns empty array for invalid input', async () => {
  const { userService } = await setupUserServiceMock()

  const result = await userService.searchUsersByUsername(null)
  assert.equal(result.length, 0)
})

test('getUserByUsername returns user when found', async () => {
  const user = {
    user_id: USER_1,
    username: 'testuser',
    display_name: 'Test User',
  }

  const { userService } = await setupUserServiceMock({
    userByUsernameData: user,
  })

  const result = await userService.getUserByUsername('testuser')
  assert.deepEqual(result, user)
})

test('listFriends returns accepted friends', async () => {
  const friendsList = [
    { user_id: USER_1, friend_id: USER_3, status: 'accepted' },
    { user_id: USER_3, friend_id: USER_2, status: 'accepted' },
  ]

  const friendProfiles = [
    { user_id: USER_1, username: 'friend1', display_name: 'Friend 1' },
    { user_id: USER_2, username: 'friend2', display_name: 'Friend 2' },
  ]

  const { userService } = await setupUserServiceMock({
    friendsList,
    friendProfiles,
  })

  const result = await userService.listFriends(USER_3)
  assert.equal(result.length, 2)
  assert.equal(result[0].username, 'friend1')
})

test('listFriends returns empty array when no friends', async () => {
  const { userService } = await setupUserServiceMock({
    friendsList: [],
    friendProfiles: [],
  })

  const result = await userService.listFriends(USER_1)
  assert.equal(result.length, 0)
})

test('listPendingFriendRequests returns pending requests received', async () => {
  const pendingRequests = [
    { user_id: USER_1, friend_id: USER_3, created_at: '2025-01-01T00:00:00Z' },
  ]

  const senderProfiles = [
    { user_id: USER_1, username: 'requester', display_name: 'Requester' },
  ]

  const { userService } = await setupUserServiceMock({
    pendingRequests,
    pendingSenderProfiles: senderProfiles,
  })

  const result = await userService.listPendingFriendRequests(USER_3)
  assert.equal(result.length, 1)
  assert.equal(result[0].username, 'requester')
  assert.equal(result[0].created_at, '2025-01-01T00:00:00Z')
})

test('listSentFriendRequests returns pending requests sent', async () => {
  const sentRequests = [
    { user_id: USER_3, friend_id: USER_2, created_at: '2025-01-01T00:00:00Z' },
  ]

  const recipientProfiles = [
    { user_id: USER_2, username: 'recipient', display_name: 'Recipient' },
  ]

  const { userService } = await setupUserServiceMock({
    sentRequests,
    sentRecipientProfiles: recipientProfiles,
  })

  const result = await userService.listSentFriendRequests(USER_3)
  assert.equal(result.length, 1)
  assert.equal(result[0].username, 'recipient')
})

test('sendFriendRequest creates new friend request', async () => {
  const { userService } = await setupUserServiceMock({
    friendProfileCheck: { user_id: USER_2 },
    existingFriendship: null,
  })

  const result = await userService.sendFriendRequest(USER_1, USER_2)
  assert.equal(result.status, 'pending')
  assert.equal(result.user_id, USER_1)
  assert.equal(result.friend_id, USER_2)
})

test('sendFriendRequest resends after rejection', async () => {
  const { userService } = await setupUserServiceMock({
    friendProfileCheck: { user_id: USER_2 },
    existingFriendship: {
      user_id: USER_1,
      friend_id: USER_2,
      status: 'rejected',
    },
  })

  const result = await userService.sendFriendRequest(USER_1, USER_2)
  assert.equal(result.status, 'pending')
})

test('acceptFriendRequest accepts pending request', async () => {
  const { userService } = await setupUserServiceMock()

  const result = await userService.acceptFriendRequest(USER_1, USER_1)
  assert.equal(result.status, 'accepted')
  assert.equal(result.user_id, USER_1)
  assert.equal(result.friend_id, USER_1)
})

test('rejectFriendRequest rejects pending request', async () => {
  const { userService } = await setupUserServiceMock()

  const result = await userService.rejectFriendRequest(USER_1, USER_1)
  assert.equal(result.status, 'rejected')
})

test('removeFriendship removes accepted friendship', async () => {
  const { userService } = await setupUserServiceMock({
    deleteFriendshipResult: [{ user_id: USER_1, friend_id: USER_1 }],
  })

  const result = await userService.removeFriendship(USER_1, USER_1)
  assert.equal(result.user_id, USER_1)
  assert.equal(result.friend_id, USER_1)
})

// ============================================================================
// Error Test Cases (REQ7)
// ============================================================================

test('getUserProfile handles database error gracefully', async () => {
  const { userService } = await setupUserServiceMock({
    profileError: true,
  })

  const result = await userService.getUserProfile(USER_1)
  assert.equal(result, null)
})

test('createOrUpdateProfile throws error when username check fails', async () => {
  const { userService } = await setupUserServiceMock({
    existingUsernameCheck: null, // Trigger username check path
    usernameCheckError: true,
  })

  await assert.rejects(
    async () => {
      await userService.createOrUpdateProfile(USER_1, {
        username: 'testuser',
      })
    },
    {
      message: /Failed to check username availability/,
    }
  )
})

test('createOrUpdateProfile throws error when username is already taken', async () => {
  const { userService } = await setupUserServiceMock({
    existingUsernameCheck: { user_id: USER_2 }, // Different user
  })

  await assert.rejects(
    async () => {
      await userService.createOrUpdateProfile(USER_1, {
        username: 'takenuser',
      })
    },
    {
      message: 'Username is already taken',
    }
  )
})

test('createOrUpdateProfile throws error when upsert fails', async () => {
  const { userService } = await setupUserServiceMock({
    existingUsernameCheck: null,
    upsertError: true,
  })

  await assert.rejects(
    async () => {
      await userService.createOrUpdateProfile(USER_1, {
        username: 'testuser',
      })
    },
    {
      message: /Failed to save profile/,
    }
  )
})

test('createOrUpdateProfile throws error for invalid username', async () => {
  const { userService } = await setupUserServiceMock()

  await assert.rejects(
    async () => {
      await userService.createOrUpdateProfile(USER_1, {
        username: 'ab', // Too short
      })
    },
    {
      message: /Username must be 3-20 characters/,
    }
  )
})

test('searchUsersByUsername throws error when database query fails', async () => {
  const { userService } = await setupUserServiceMock({
    searchError: true,
  })

  await assert.rejects(
    async () => {
      await userService.searchUsersByUsername('test')
    },
    {
      message: /Failed to search users/,
    }
  )
})

test('getUserByUsername throws error when user not found', async () => {
  const { userService } = await setupUserServiceMock({
    userByUsernameData: null,
  })

  await assert.rejects(
    async () => {
      await userService.getUserByUsername('nonexistent')
    },
    {
      message: 'User not found',
    }
  )
})

test('getUserByUsername throws error when database query fails', async () => {
  const { userService } = await setupUserServiceMock({
    userByUsernameError: true,
  })

  await assert.rejects(
    async () => {
      await userService.getUserByUsername('testuser')
    },
    {
      message: /Failed to find user/,
    }
  )
})

test('getUserByUsername throws error for invalid username', async () => {
  const { userService } = await setupUserServiceMock()

  await assert.rejects(
    async () => {
      await userService.getUserByUsername('ab') // Too short
    },
    {
      message: /Username must be 3-20 characters/,
    }
  )
})

test('listFriends throws error when friends query fails', async () => {
  const { userService } = await setupUserServiceMock({
    friendsError: true,
  })

  await assert.rejects(
    async () => {
      await userService.listFriends(USER_1)
    },
    {
      message: /Database query failed/,
    }
  )
})

test('listFriends throws error when friend profiles query fails', async () => {
  const { userService } = await setupUserServiceMock({
    friendsList: [{ user_id: USER_1, friend_id: USER_1, status: 'accepted' }],
    friendProfilesError: true,
  })

  await assert.rejects(
    async () => {
      await userService.listFriends(USER_1)
    },
    {
      message: /Failed to fetch friend profiles/,
    }
  )
})

test('listPendingFriendRequests throws error when requests query fails', async () => {
  const { userService } = await setupUserServiceMock({
    pendingRequestsError: true,
  })

  await assert.rejects(
    async () => {
      await userService.listPendingFriendRequests(USER_1)
    },
    {
      message: /Database query failed/,
    }
  )
})

test('listPendingFriendRequests throws error when sender profiles query fails', async () => {
  const { userService } = await setupUserServiceMock({
    pendingRequests: [{ user_id: USER_1, friend_id: USER_1, created_at: '2025-01-01T00:00:00Z' }],
    pendingSenderProfilesError: true,
  })

  await assert.rejects(
    async () => {
      await userService.listPendingFriendRequests(USER_1)
    },
    {
      message: /Failed to fetch sender profiles/,
    }
  )
})

test('listSentFriendRequests throws error when requests query fails', async () => {
  const { userService } = await setupUserServiceMock({
    sentRequestsError: true,
  })

  await assert.rejects(
    async () => {
      await userService.listSentFriendRequests(USER_1)
    },
    {
      message: /Database query failed/,
    }
  )
})

test('listSentFriendRequests throws error when recipient profiles query fails', async () => {
  const { userService } = await setupUserServiceMock({
    sentRequests: [{ user_id: USER_1, friend_id: USER_2, created_at: '2025-01-01T00:00:00Z' }],
    sentRecipientProfilesError: true,
  })

  await assert.rejects(
    async () => {
      await userService.listSentFriendRequests(USER_1)
    },
    {
      message: /Failed to fetch recipient profiles/,
    }
  )
})

test('sendFriendRequest throws error when cannot add self as friend', async () => {
  const { userService } = await setupUserServiceMock()

  await assert.rejects(
    async () => {
      await userService.sendFriendRequest(USER_1, USER_1)
    },
    {
      message: 'Cannot add yourself as a friend',
    }
  )
})

test('sendFriendRequest throws error when friend profile check fails', async () => {
  const { userService } = await setupUserServiceMock({
    friendProfileCheckError: true,
  })

  await assert.rejects(
    async () => {
      await userService.sendFriendRequest(USER_1, USER_2)
    },
    {
      message: /Failed to check friend/,
    }
  )
})

test('sendFriendRequest throws error when user not found', async () => {
  const { userService } = await setupUserServiceMock({
    friendProfileCheck: null,
  })

  await assert.rejects(
    async () => {
      await userService.sendFriendRequest(USER_1, USER_2)
    },
    {
      message: 'User not found',
    }
  )
})

test('sendFriendRequest throws error when existing friendship check fails', async () => {
  const { userService } = await setupUserServiceMock({
    friendProfileCheck: { user_id: USER_2 },
    existingFriendshipError: true,
  })

  await assert.rejects(
    async () => {
      await userService.sendFriendRequest(USER_1, USER_2)
    },
    {
      message: /Failed to check existing friendship/,
    }
  )
})

test('sendFriendRequest throws error when already friends', async () => {
  const { userService } = await setupUserServiceMock({
    friendProfileCheck: { user_id: USER_2 },
    existingFriendship: {
      user_id: USER_1,
      friend_id: USER_2,
      status: 'accepted',
    },
  })

  await assert.rejects(
    async () => {
      await userService.sendFriendRequest(USER_1, USER_2)
    },
    {
      message: 'You are already friends',
    }
  )
})

test('sendFriendRequest throws error when request already sent', async () => {
  const { userService } = await setupUserServiceMock({
    friendProfileCheck: { user_id: USER_2 },
    existingFriendship: {
      user_id: USER_1,
      friend_id: USER_2,
      status: 'pending',
    },
  })

  await assert.rejects(
    async () => {
      await userService.sendFriendRequest(USER_1, USER_2)
    },
    {
      message: 'Friend request already sent',
    }
  )
})

test('sendFriendRequest throws error when other user already sent request', async () => {
  const { userService } = await setupUserServiceMock({
    friendProfileCheck: { user_id: USER_2 },
    existingFriendship: {
      user_id: USER_2,
      friend_id: USER_1,
      status: 'pending',
    },
  })

  await assert.rejects(
    async () => {
      await userService.sendFriendRequest(USER_1, USER_2)
    },
    {
      message: /This user has already sent you a friend request/,
    }
  )
})

test('sendFriendRequest throws error when insert fails', async () => {
  const { userService } = await setupUserServiceMock({
    friendProfileCheck: { user_id: USER_2 },
    existingFriendship: null,
    insertFriendshipError: true,
  })

  await assert.rejects(
    async () => {
      await userService.sendFriendRequest(USER_1, USER_2)
    },
    {
      message: /Failed to send friend request/,
    }
  )
})

test('sendFriendRequest throws error when update fails during resend', async () => {
  const { userService } = await setupUserServiceMock({
    friendProfileCheck: { user_id: USER_2 },
    existingFriendship: {
      user_id: USER_1,
      friend_id: USER_2,
      status: 'rejected',
    },
    updateFriendshipError: true,
  })

  await assert.rejects(
    async () => {
      await userService.sendFriendRequest(USER_1, USER_2)
    },
    {
      message: /Failed to resend friend request/,
    }
  )
})

test('acceptFriendRequest throws error when request find fails', async () => {
  const { userService } = await setupUserServiceMock({
    requestFindError: true,
  })

  await assert.rejects(
    async () => {
      await userService.acceptFriendRequest(USER_1, USER_1)
    },
    {
      message: /Failed to find friend request/,
    }
  )
})

test('acceptFriendRequest throws error when request not found', async () => {
  const { userService } = await setupUserServiceMock({
    requestData: null, // maybeSingle returns null
  })

  await assert.rejects(
    async () => {
      await userService.acceptFriendRequest(USER_1, USER_1)
    },
    {
      message: 'Friend request not found or already processed',
    }
  )
})

test('acceptFriendRequest throws error when update fails', async () => {
  const { userService } = await setupUserServiceMock({
    requestUpdateError: true,
  })

  await assert.rejects(
    async () => {
      await userService.acceptFriendRequest(USER_1, USER_1)
    },
    {
      message: /Failed to accept friend request/,
    }
  )
})

test('rejectFriendRequest throws error when request find fails', async () => {
  const { userService } = await setupUserServiceMock({
    requestFindError: true,
  })

  await assert.rejects(
    async () => {
      await userService.rejectFriendRequest(USER_1, USER_1)
    },
    {
      message: /Failed to find friend request/,
    }
  )
})

test('rejectFriendRequest throws error when request not found', async () => {
  const { userService } = await setupUserServiceMock({
    requestData: null, // maybeSingle returns null
  })

  await assert.rejects(
    async () => {
      await userService.rejectFriendRequest(USER_1, USER_1)
    },
    {
      message: 'Friend request not found or already processed',
    }
  )
})

test('rejectFriendRequest throws error when update fails', async () => {
  const { userService } = await setupUserServiceMock({
    requestUpdateError: true,
  })

  await assert.rejects(
    async () => {
      await userService.rejectFriendRequest(USER_1, USER_1)
    },
    {
      message: /Failed to reject friend request/,
    }
  )
})

test('removeFriendship throws error when delete fails', async () => {
  const { userService } = await setupUserServiceMock({
    deleteFriendshipError: true,
  })

  await assert.rejects(
    async () => {
      await userService.removeFriendship(USER_1, USER_1)
    },
    {
      message: /Failed to remove friendship/,
    }
  )
})

test('removeFriendship throws error when friendship not found', async () => {
  const { userService } = await setupUserServiceMock({
    deleteFriendshipResult: [],
  })

  await assert.rejects(
    async () => {
      await userService.removeFriendship(USER_1, USER_1)
    },
    {
      message: 'Friendship not found',
    }
  )
})

// ============================================================================
// Edge Case Tests
// ============================================================================

test('validateUsername handles various edge cases', async () => {
  const { userService } = await setupUserServiceMock()

  // Test the exported validateUsername function
  const { validateUsername } = userService

  // Too short
  assert.equal(validateUsername('ab').valid, false)

  // Too long
  assert.equal(validateUsername('a'.repeat(21)).valid, false)

  // Invalid characters
  assert.equal(validateUsername('test@user').valid, false)
  assert.equal(validateUsername('test user').valid, false)

  // Valid with underscores and hyphens
  assert.equal(validateUsername('test_user-123').valid, true)
  assert.equal(validateUsername('test_user-123').username, 'test_user-123')

  // Case normalization
  assert.equal(validateUsername('TestUser').valid, true)
  assert.equal(validateUsername('TestUser').username, 'testuser')

  // Trimming
  assert.equal(validateUsername('  testuser  ').valid, true)
  assert.equal(validateUsername('  testuser  ').username, 'testuser')

  // Null/undefined
  assert.equal(validateUsername(null).valid, false)
  assert.equal(validateUsername(undefined).valid, false)
  assert.equal(validateUsername('').valid, false)
})

test('listPendingFriendRequests returns empty array when no requests', async () => {
  const { userService } = await setupUserServiceMock({
    pendingRequests: [],
  })

  const result = await userService.listPendingFriendRequests(USER_1)
  assert.equal(result.length, 0)
})

test('listSentFriendRequests returns empty array when no requests', async () => {
  const { userService } = await setupUserServiceMock({
    sentRequests: [],
  })

  const result = await userService.listSentFriendRequests(USER_1)
  assert.equal(result.length, 0)
})

