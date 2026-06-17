# Westlake Business Manager - Full Shared Login Supabase App

This is the full working app build.

## Includes
- Persistent Supabase login
- Reset Supabase Setup button
- Shared business access for you and your partner
- Home
- Jobs with Upcoming / Calendar / All
- Invoices & Estimates combined
- Customers
- Equipment
- Expenses
- Reports with sales tax collected and taxable sales
- Settings with Services, History, Marketing, Backups
- Brevo CSV export
- PDF/print documents

## Setup
1. Upload these files to GitHub Pages or Netlify.
2. In Supabase SQL Editor, run `supabase-shared-schema.sql`.
3. In the app, paste:
   - Supabase Project URL
   - anon public key
4. Create your account.
5. Create Business.
6. Copy the Business ID from Settings.
7. Partner creates account and joins with that Business ID.

## Password reset
Supabase > Authentication > URL Configuration:
- Site URL = your app URL
- Redirect URLs = your app URL

## Important
Use the anon public key only. Never use the service role key in the app.
