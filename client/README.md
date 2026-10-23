# ClientFlow CRM - Client (React + Vite)
    cd client; Copy-Item .env.example .env; npm install; npm run dev     # http://localhost:5173
Requires the server running (see ../server/README.md) with CLIENT_URL=http://localhost:5173.
Pages built: Login, Dashboard (live stats + charts), Leads (search/filter/paginate/create), Pipeline (drag-and-drop with server-side stage updates; mobile uses the per-card "move to" select since HTML5 drag-and-drop does not work on touch).
Drag-and-drop uses the native HTML5 API (no extra dependency).
