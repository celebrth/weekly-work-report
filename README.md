# Weekly Work Reporting and Leader Feedback System

Welcome! This application helps team members submit their weekly progress and allows leaders to provide constructive feedback. It is built using **Next.js**, **Supabase**, and **Tailwind CSS**.

Even if you are a beginner, follow this step-by-step guide to get everything up and running on your computer.

---

## 1. Prerequisites

Before starting, make sure you have the following installed on your computer:
- **Node.js** (Version 18 or higher): [Download here](https://nodejs.org/)
- **Git** (optional, but recommended): [Download here](https://git-scm.com/)

You also need a free account at **Supabase**, which is our database and authentication provider.
- Go to [Supabase](https://supabase.com/) and click "Start your project" to sign up.

---

## 2. Setting up the Supabase Database

1. Once logged into Supabase, click **New Project**. Name it something like "Weekly Reports". Wait a few minutes for the database to be provisioned.
2. On the left sidebar of your project dashboard, click the **SQL Editor** icon (it looks like a terminal window with `>_`).
3. Click **New query**.
4. Open the `supabase/schema.sql` file from this project code, copy all the text inside it, and paste it into the Supabase SQL Editor.
5. Click the **Run** button at the bottom right. This sets up all the tables (profiles, reports, feedbacks) and security rules.

---

## 3. Connecting the Code to Supabase

We need to tell our Next.js code how to securely talk to your new database.

1. In your Supabase dashboard, click the **Settings** gear icon at the bottom left.
2. Click on **API** under the "Configuration" section.
3. You will see two important keys here:
   - **Project URL** (This is your `NEXT_PUBLIC_SUPABASE_URL`)
   - **Project API Keys -> anon / public** (This is your `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
4. Open the code folder on your computer. Create a new file right in the main folder (the same place where this README is) and name it exactly: `.env.local`
5. Open `.env.local` and paste your keys like this (replace the placeholders with your actual keys):

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhb...your-long-key...
```

*Note: Never share this file or push it to GitHub.*

---

## 4. Running the App Locally

Now we are ready to start the app!

1. Open your terminal (or Command Prompt / PowerShell) and navigate to the project folder.
2. Run this command to install all the necessary code packages:
   ```bash
   npm install
   ```
   *(Wait for this to finish, it might take a minute)*
3. Run this command to start the local development server:
   ```bash
   npm run dev
   ```
4. Open your web browser and go to: [http://localhost:3000](http://localhost:3000)

You should now see the Login page!

---

## 5. Testing the App (Members and Leaders)

### Create a Member Account
1. On the [http://localhost:3000](http://localhost:3000) login page, click "Sign Up".
2. Enter a name, an email, and a password.
3. Once successful, you will be logged in as a **Member** and redirected to the Member Dashboard.

### Create a Leader Account
By default, everyone who signs up is a "member" to keep things secure. To test the Leader dashboard, you need to manually promote a user in Supabase:
1. Sign out of the app and create a second account (e.g., `leader@test.com`).
2. Go back to your [Supabase dashboard](https://supabase.com/).
3. Click the **Table Editor** icon on the left sidebar.
4. Click on the `profiles` table.
5. Find the row with `leader@test.com`.
6. Double-click the `role` cell for that user, change the word `member` to `leader`, and hit Enter to save.
7. Go back to your app, sign in with `leader@test.com`, and you will automatically be taken to the Leader Dashboard!

---

## 6. Troubleshooting Common Beginner Errors

- **"Failed to fetch" or "Network Error" on login:** 
  Check your `.env.local` file. Make sure the names exactly match `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and that you restarted your server (`npm run dev`) after creating the file.

- **I signed up but can't log in! It says "Email not confirmed":**
  By default, Supabase requires users to confirm their email. For local testing, you can turn this off:
  1. Go to Supabase -> **Authentication** -> **Providers** -> **Email**.
  2. Toggle **Confirm email** to off and click Save.
  3. Now try signing up with a new email.

- **Changes in the code aren't showing up:**
  Refresh your browser. If that doesn't work, stop the server in your terminal (press `Ctrl + C`) and run `npm run dev` again.

---

Happy building! Proceed to phase 2 when ready.
