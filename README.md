# SGOD TAP - Supabase Edition

A modern task and assignment platform for managing student requests, powered by Supabase and Vercel.

## Features

- 🔐 **Secure Authentication**: Supabase Auth with email/password
- 📝 **Request Management**: Create, track, and manage student requests
- 💬 **Real-time Communication**: Comments and discussions on requests
- 🎯 **Task Assignment**: Assign requests to TAs and instructors
- 📱 **Responsive Design**: Works seamlessly on desktop and mobile
- 🔔 **Notifications**: Stay updated with request changes
- 📊 **Analytics**: Track request statistics and metrics

## Tech Stack

- **Frontend**: React 18 + Vite
- **Authentication**: Supabase Auth
- **Database**: PostgreSQL (via Supabase)
- **Styling**: Tailwind CSS + Radix UI
- **Deployment**: Vercel
- **State Management**: React Context + TanStack Query

## Getting Started

### Prerequisites

- Node.js 16+
- npm or yarn
- Supabase account (free at https://supabase.com)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/CapinigSamson/sgod-tap.git
cd sgod-tap
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

4. Add your Supabase credentials to `.env.local`:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

You can find these in your Supabase project settings:
- Go to https://app.supabase.com
- Select your project
- Click "Settings" → "API"
- Copy the Project URL and anon key

### Running Locally

```bash
npm run dev
```

The app will be available at `http://localhost:3000`

### Building for Production

```bash
npm run build
```

This creates an optimized production build in the `dist/` directory.

## Database Setup

### Applying Migrations

1. In Supabase Dashboard:
   - Go to your project
   - Navigate to "SQL Editor"
   - Click "New Query"
   - Copy and paste the contents of `supabase/migrations/001_init_schema.sql`
   - Click "Run"

2. Optionally, run the seed data:
   - Copy and paste `supabase/migrations/002_seed_data.sql`
   - Modify user IDs as needed
   - Click "Run"

### Database Schema

- **users**: Extended user profiles
- **requests**: Student requests and tasks
- **comments**: Discussion threads on requests
- **assignments**: Track who is assigned to each request
- **notifications**: Real-time alerts for users
- **shared_files**: File attachments for requests
- **feedback**: User feedback and ratings

## Deployment to Vercel

1. Push your code to GitHub
2. Go to https://vercel.com and sign in
3. Click "New Project"
4. Select your GitHub repository
5. Add environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
6. Click "Deploy"

The app will be automatically deployed on every push to main.

## Environment Variables

Create a `.env.local` file in the root directory:

```env
# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## Authentication

### Signing Up

Users can create accounts using:
- Email address
- Password (minimum 6 characters recommended)

### Email Verification

Optional: Enable email verification in Supabase:
1. Go to Authentication settings
2. Enable "Email Confirmations"
3. Users will receive a verification link

### Password Reset

Users can reset their password using the "Forgot Password" link. Emails are sent from your Supabase project.

## Security

- Row Level Security (RLS) policies protect data
- Authentication tokens stored securely
- HTTPS enforced in production
- Environment variables kept private
- Never commit `.env.local` to version control

## Development

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
npm run lint:fix     # Fix linting issues
npm run typecheck    # Type check with TypeScript
```

### Project Structure

```
.
├── lib/                    # Utilities and context
│   ├── supabase.js        # Supabase client and helpers
│   ├── AuthContext.jsx    # Authentication context
│   └── ...
├── pages/                  # Page components
├── components/             # Reusable components
├── supabase/               # Database migrations
│   └── migrations/         # SQL migration files
├── public/                 # Static assets
├── .env.example           # Example environment variables
├── vercel.json            # Vercel configuration
├── vite.config.js         # Vite configuration
└── package.json           # Dependencies and scripts
```

## Troubleshooting

### "Missing Supabase URL or Anon Key"
- Check that `.env.local` exists in the root directory
- Verify the correct environment variable names
- Restart the development server after updating `.env.local`

### Authentication not working
- Confirm Supabase project is active
- Check that environment variables are correct
- Verify email/password are valid

### Database errors
- Run migrations in correct order
- Check database user permissions
- Verify RLS policies are enabled

## Contributing

1. Create a feature branch: `git checkout -b feature/amazing-feature`
2. Commit changes: `git commit -m 'Add amazing feature'`
3. Push to branch: `git push origin feature/amazing-feature`
4. Open a Pull Request

## License

MIT License - see LICENSE file for details

## Support

- 📧 Email: support@example.com
- 🐛 Issues: https://github.com/CapinigSamson/sgod-tap/issues
- 📚 Supabase Docs: https://supabase.com/docs
- 💬 Supabase Community: https://discord.supabase.com

## Migration Notes

### From Base44 to Supabase

This project has been migrated from Base44 backend to Supabase. Key changes:

- ✅ Removed: `@base44/sdk`, `@base44/vite-plugin`
- ✅ Added: `@supabase/supabase-js`
- ✅ Updated: Authentication implementation
- ✅ Created: PostgreSQL database schema
- ✅ Configured: Row Level Security policies
- ✅ Ready: GitHub + Vercel deployment

All app functionality is preserved with enhanced reliability and scalability.
