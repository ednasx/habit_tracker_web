-- Migration: Add username to user_profiles and friend request status to friends table
-- Date: 2025-12-05
-- Description: Implements username-based friend discovery and friend request system

-- Step 1: Update user_profiles table to add username
-- NOTE: If you already have user_profiles records without usernames,
-- you'll need to populate them before adding NOT NULL constraint

-- Add username column (nullable first to allow existing records)
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS username text;

-- Add updated_at column if it doesn't exist
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Create unique index on username (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_profiles_username_unique 
ON public.user_profiles(username);

-- Create index for faster username lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_username 
ON public.user_profiles(username);

-- After populating usernames for existing users, make username NOT NULL:
-- ALTER TABLE public.user_profiles ALTER COLUMN username SET NOT NULL;

-- Step 2: Update friends table to add status column for friend requests
ALTER TABLE public.friends
ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending';

-- Add updated_at column to friends table
ALTER TABLE public.friends
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Add check constraint for status values
ALTER TABLE public.friends
ADD CONSTRAINT friends_status_check 
CHECK (status IN ('pending', 'accepted', 'rejected'));

-- Update existing friendships to 'accepted' status (if any exist)
UPDATE public.friends
SET status = 'accepted', updated_at = now()
WHERE status = 'pending';

-- Create indexes for faster friend queries
CREATE INDEX IF NOT EXISTS idx_friends_user_id ON public.friends(user_id);
CREATE INDEX IF NOT EXISTS idx_friends_friend_id ON public.friends(friend_id);
CREATE INDEX IF NOT EXISTS idx_friends_status ON public.friends(status);

-- Step 3: Add RLS policies for user_profiles (if not already exists)
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Allow users to view all profiles (for search)
DROP POLICY IF EXISTS "Users can view all profiles" ON public.user_profiles;
CREATE POLICY "Users can view all profiles"
ON public.user_profiles
FOR SELECT
USING (true);

-- Allow users to update their own profile
DROP POLICY IF EXISTS "Users can update their own profile" ON public.user_profiles;
CREATE POLICY "Users can update their own profile"
ON public.user_profiles
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Allow users to insert their own profile
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.user_profiles;
CREATE POLICY "Users can insert their own profile"
ON public.user_profiles
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Step 4: Add RLS policies for friends table
ALTER TABLE public.friends ENABLE ROW LEVEL SECURITY;

-- Users can view friendships where they are involved
DROP POLICY IF EXISTS "Users can view their friendships" ON public.friends;
CREATE POLICY "Users can view their friendships"
ON public.friends
FOR SELECT
USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- Users can send friend requests (insert)
DROP POLICY IF EXISTS "Users can send friend requests" ON public.friends;
CREATE POLICY "Users can send friend requests"
ON public.friends
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update friend request status (accept/reject)
-- Restrict friend request status updates to proper actors
DROP POLICY IF EXISTS "Users can update friend request status" ON public.friends;

-- Only the recipient can accept or reject a friend request
CREATE POLICY "Recipient can accept or reject friend request"
ON public.friends
FOR UPDATE
USING (
  auth.uid() = friend_id
  AND status = 'pending'
)
WITH CHECK (
  auth.uid() = friend_id
  AND (status = 'accepted' OR status = 'rejected')
);

-- Only the requester can cancel their own pending friend request
CREATE POLICY "Requester can cancel pending friend request"
ON public.friends
FOR UPDATE
USING (
  auth.uid() = user_id
  AND status = 'pending'
)
WITH CHECK (
  auth.uid() = user_id
  AND status = 'cancelled'
);
-- Users can delete their friendships
DROP POLICY IF EXISTS "Users can delete friendships" ON public.friends;
CREATE POLICY "Users can delete friendships"
ON public.friends
FOR DELETE
USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- Step 5: Create a function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON public.user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON public.user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_friends_updated_at ON public.friends;
CREATE TRIGGER update_friends_updated_at
    BEFORE UPDATE ON public.friends
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Done! Now users can:
-- 1. Set a unique username in their profile
-- 2. Search for other users by username
-- 3. Send friend requests that must be accepted
-- 4. Accept or reject pending friend requests

