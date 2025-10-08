# List Sharing Setup Instructions

This document explains how to set up the list sharing feature for Todoloo.

## Overview

The sharing feature allows you to share your todo list with other users (like your wife). When you share your list with someone, they can:
- View all your todos
- Add new todos to your list
- Edit existing todos
- Complete todos
- See the same insights and history

## Setup Steps

### 1. Run the Database Migration

1. Log into your [Supabase Dashboard](https://supabase.com/dashboard)
2. Navigate to your Todoloo project
3. Go to **SQL Editor** in the left sidebar
4. Open the file `supabase-migration-list-shares.sql` from your project root
5. Copy the entire SQL content
6. Paste it into the SQL Editor
7. Click **Run** to execute the migration

This will:
- Create the `list_shares` table
- Add proper Row Level Security (RLS) policies
- Update policies for `todos` and `task_completions` tables to include shared access
- Create helper functions for finding users by email

### 2. Verify the Migration

After running the migration, verify it worked:

1. In Supabase Dashboard, go to **Database** → **Tables**
2. You should see a new table called `list_shares`
3. Click on it to verify it has these columns:
   - `id` (uuid)
   - `created_at` (timestamp)
   - `list_owner_id` (uuid)
   - `shared_with_user_id` (uuid)
   - `permission` (text)

### 3. How to Share Your List

1. Make sure both you and your wife have created accounts in Todoloo
   - She needs to sign in at least once to create her account
2. Go to the **Settings** page in Todoloo
3. Scroll to the **List Sharing** section
4. Enter your wife's email address in the input field
5. Click **Share**

### 4. For the Shared User (Your Wife)

Once you've shared your list:

1. She logs into Todoloo with her own account
2. She'll automatically see your todos when she opens the app
3. Any todos she creates will be added to your list
4. Changes she makes will sync in real-time

## Features

### What You Can Do (List Owner)

- Share your list with multiple people
- See who has access to your list
- Remove access for any user
- All todos remain owned by you (even ones added by shared users)

### What Shared Users Can Do

- Add new todos to your list
- Edit any todo on your list
- Complete todos
- View insights and history
- Everything they do is attributed to your account

### Permissions

Currently, all sharing is with **write** permission, which means shared users can:
- ✅ View todos
- ✅ Create todos
- ✅ Edit todos
- ✅ Delete todos
- ✅ Complete todos

## Security

- All data is protected by Row Level Security (RLS) policies
- Users can only share their own lists
- Users can only see shares they're involved in (as owner or shared user)
- The owner controls all sharing relationships

## Troubleshooting

### "User with email X not found"
- The person needs to sign into Todoloo at least once to create their account
- Make sure the email is exactly the same as they used to sign up

### "List is already shared with this user"
- You've already shared your list with this person
- Check the "People with access" section to see existing shares

### Shared user doesn't see my todos
- Make sure they're logged in with the correct account
- Try refreshing the page
- Check that the share was created successfully in Settings

## Removing Access

1. Go to **Settings** → **List Sharing**
2. Find the user in "People with access"
3. Click the trash icon next to their name
4. They will immediately lose access to your list

## Notes

- When viewing shared lists, users see all todos from the list owner
- Currently there's no way to see who added/edited a specific todo
- All history and insights are based on the list owner's data
- Shared users cannot share the list further (only the owner can manage sharing)
