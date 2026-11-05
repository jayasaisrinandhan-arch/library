# LibraryHub – Online Library Management System (LocalStorage edition)

A React + Vite library management project. It uses browser LocalStorage instead of Supabase, so no database account, API keys, SQL setup, or backend server is required.

## Requirements
- Node.js 20 or newer
- VS Code (recommended)

## Run on Windows
Open this folder in VS Code, open Terminal > New Terminal, then run:

```powershell
npm.cmd install
npm.cmd run dev
```

Open the local URL printed by Vite (usually http://localhost:5173).

## Demo administrator login
- Email: `admin@libraryhub.local`
- Password: `Admin@123`

Students can create accounts using **Create an account**. New registrations always receive the Student role. Do not use real passwords in this demo project.

## Data storage
Books, student accounts, borrowings, reservations, and notifications are stored in the browser's LocalStorage. Data remains after refresh in the same browser profile, but does not sync between devices or browsers. Clearing browser site data removes this information. This is a learning/demo implementation, not secure production authentication or multi-user online storage.

## Deploy
Push the project to GitHub and import the repository into Vercel. The Vite build command is `npm run build`, and the output folder is `dist`.
