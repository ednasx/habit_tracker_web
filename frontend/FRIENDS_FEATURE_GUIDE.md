# Friends Feature - Frontend Integration Guide

## Overview
The frontend now includes a complete friends system that integrates with the user-service API.

## New Features

### 1. Username Setup (First-Time Users)
- **Component**: `UsernameSetup.jsx`
- **Flow**: After login/registration, users without a username are prompted to create one
- **Validation**: 3-20 characters, lowercase letters, numbers, underscores, hyphens only
- **Location**: Automatically shown after authentication if no profile exists

### 2. Friends Page
- **Component**: `Friends.jsx`
- **Features**:
  - **Friends List Tab**: View all accepted friends
  - **Requests Tab**: Manage incoming and outgoing friend requests
  - **Find Friends Tab**: Search for users by username

### 3. Navigation Updates
- **Component**: `Navbar.jsx` (updated)
- **New Features**:
  - Dashboard and Friends navigation buttons
  - Pending requests badge on Friends button
  - Real-time notification indicator

### 4. User API Service
- **File**: `services/userApi.js`
- **Functions**:
  - `getUserProfile()` - Get current user profile
  - `createOrUpdateProfile()` - Set username
  - `searchUsers()` - Search by username
  - `getFriends()` - List friends
  - `getPendingRequests()` - List incoming requests
  - `getSentRequests()` - List outgoing requests
  - `sendFriendRequest()` - Send request by username
  - `acceptFriendRequest()` - Accept request
  - `rejectFriendRequest()` - Reject request
  - `removeFriend()` - Remove friend

## User Flows

### New User Registration
1. User signs up via email/password
2. User is redirected to Username Setup screen
3. User enters unique username (validated)
4. User proceeds to Dashboard

### Finding & Adding Friends
1. Click "Friends" button in navbar
2. Go to "Find Friends" tab
3. Search by username (minimum 2 characters)
4. Click "Add Friend" on search result
5. Friend request is sent (status: pending)

### Accepting Friend Requests
1. See notification badge on "Friends" button
2. Click "Friends" → "Requests" tab
3. View "Requests Received" section
4. Click "Accept" or "Reject"
5. Accepted friends appear in "Friends" tab

### Managing Friends
1. Go to "Friends" tab
2. View list of all friends
3. Click "Remove" to unfriend (requires confirmation)

## Technical Details

### State Management
- `App.jsx` manages:
  - Current view (dashboard/friends)
  - User profile check
  - Pending requests count (polls every 30 seconds)

### Profile Check Flow
```javascript
session exists → check getUserProfile()
  ├─ Profile exists with username → Show app
  └─ Profile missing/no username → Show UsernameSetup
```

### Real-time Updates
- Pending requests count refreshes every 30 seconds
- Badge appears on Friends button when requests pending
- Optimistic UI updates after actions (request sent, friend removed, etc.)

## Styling Notes

### Components Use Bootstrap 5
- Cards for user/friend display
- Tabs for navigation
- Badges for notifications
- Alerts for success/error messages
- Responsive grid layout

### Custom Enhancements Needed (Optional)
You may want to add:
- Custom colors matching your theme
- Animations for friend request actions
- Toast notifications instead of alerts
- Infinite scroll for search results
- User avatars/profile pictures

## API Integration

### Authentication
All requests use the JWT token from Supabase Auth:
```javascript
// Set in useAuthSession hook
setAuthToken(session?.access_token)
```

### Error Handling
Errors are caught and displayed in:
- Alert messages (dismissible)
- Inline error text
- Console logs for debugging

### Environment Variables
Make sure your `.env` or `vite` config has:
```
VITE_API_BASE_URL=http://localhost:8080/api
```

## Testing Checklist

### Username Setup
- [ ] Shows after first login
- [ ] Validates username format
- [ ] Shows error for duplicate username
- [ ] Redirects to dashboard after success

### Search & Add Friends
- [ ] Search returns results
- [ ] Can send friend request
- [ ] Shows success message
- [ ] Request appears in "Requests Sent"

### Accept/Reject Requests
- [ ] Pending badge appears on navbar
- [ ] Requests visible in Requests tab
- [ ] Accept button adds to Friends list
- [ ] Reject button removes request

### Friends List
- [ ] Shows all accepted friends
- [ ] Remove button works with confirmation
- [ ] Empty state shows "Find Friends" button

## Troubleshooting

### Username Setup Not Showing
- Check that user-service is running
- Verify API endpoint returns 404 for missing profile
- Check browser console for errors

### Friends Not Loading
- Verify user-service API is accessible
- Check network tab for failed requests
- Ensure JWT token is being sent in headers

### Pending Badge Not Updating
- Check that polling interval is running (30s)
- Verify getPendingRequests() is working
- Check for console errors

## Future Enhancements

Consider adding:
1. **Push Notifications**: Real-time friend request notifications
2. **User Profiles**: Click friend to see their habits/stats
3. **Friend Activity Feed**: See when friends complete habits
4. **Friend Suggestions**: "People you may know" feature
5. **Mutual Friends**: Show mutual connections
6. **Block/Report**: Safety features
7. **Friend Groups**: Organize friends into categories

## Files Modified/Created

### New Files
- `src/services/userApi.js` - User & Friends API client
- `src/components/UsernameSetup.jsx` - Username setup component
- `src/components/Friends.jsx` - Friends management page
- `frontend/FRIENDS_FEATURE_GUIDE.md` - This file

### Modified Files
- `src/App.jsx` - Profile check, navigation, friends view
- `src/components/layout/Navbar.jsx` - Navigation buttons, pending badge
- `src/components/layout/AppLayout.jsx` - Pass navigation props

## Support
For issues or questions about the friends feature implementation, check:
- Backend API docs: `user-service/README_FRIENDS_FEATURE.md`
- OpenAPI spec: `user-service/openapi.yaml`
- Database schema: `docs/database-schema.md`

