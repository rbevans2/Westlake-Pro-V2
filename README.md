# Westlake Business Manager — Supabase Version

This is the shared cloud version for Westlake Tree Experts.

## Files included

- `index.html` — app screen layout
- `style.css` — mobile-friendly app styling and one-page print styles
- `app.js` — Supabase app logic
- `manifest.json` — installable mobile app settings
- `service-worker.js` — offline shell caching
- `logo.png` — Westlake Tree Experts logo
- `icon-192.png` and `icon-512.png` — app icons
- `supabase-shared-schema.sql` — database setup and v2 update script

## Setup

1. Upload these files to the root of your GitHub repository.
2. In Supabase, open SQL Editor.
3. Run the full `supabase-shared-schema.sql` file.
4. Open the app URL.
5. Paste your Supabase Project URL and anon public key.
6. Create your account and business.
7. Copy the Business ID from Settings so another phone/user can join the same business.

## Features

- Shared Supabase data between phones
- Westlake logo in app, invoices, estimates, and printouts
- Clickable Home dashboard cards
- Open invoice, paid invoice, open estimate, and scheduled job filters
- Customer notes, property address, history, last service date, and lifetime revenue
- Estimates with signature, approval status, job scheduling, and invoice conversion
- Invoices with partial payments, balance due, payment history, and print/PDF
- Jobs with upcoming, calendar, completed, and all views
- Reports by month, service, category, customer, and year
- Expenses, equipment, marketing export, and backups

## Important

Use the Supabase anon/public key only. Never paste a service role key into the app.
