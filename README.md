# RoomLab

Interactive floor planner: draw a room, drag furniture, snap to walls, and walk through the same plan in 3D.

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The editor, undo history, and file export work in the browser without an account.

To save, share, and list public designs, create a Supabase project, run `supabase/migrations/0001_init.sql`, enable anonymous sign-ins, and copy the URL and anon key into `.env.local` using `.env.example`.

```bash
npm test
npm run test:e2e
```
