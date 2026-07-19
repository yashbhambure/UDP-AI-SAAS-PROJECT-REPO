# Antigravity Developer Rules

- **Background Process Lifecycle**: You must never leave any background server processes (e.g., Express servers, nodemon, or `startWithLocalDB.js` sessions) running at the end of a task turn. Before concluding your final response, explicitly query all active background tasks, kill any database/API server tasks you started, and confirm they are terminated so they do not conflict with the user's local terminal session.
