# Folder Structure

ah-transport-hrms/
├── backend/
│   ├── src/
│   │   ├── config/env.js           # centralized env
│   │   ├── db/database.js          # better-sqlite3 init, WAL
│   │   ├── db/migrate.js
│   │   ├── middleware/auth.js      # JWT, RBAC, officeScope
│   │   ├── middleware/audit.js
│   │   ├── utils/auth.js           # bcrypt, jwt sign/verify
│   │   ├── utils/logger.js         # winston
│   │   ├── routes/
│   │   │   ├── auth.routes.js
│   │   │   ├── employees.routes.js
│   │   │   ├── attendance.routes.js
│   │   │   ├── leaves.routes.js
│   │   │   ├── payroll.routes.js
│   │   │   ├── dashboard.routes.js
│   │   │   ├── reports.routes.js
│   │   │   ├── export.routes.js
│   │   │   └── master.routes.js
│   │   └── server.js               # Express app, seed
│   └── package.json
├── frontend/
│   └── public/
│       ├── index.html              # Tailwind + Chart.js SPA shell
│       └── app.js                  # Vanilla modular SPA, 1100 LOC
├── database/
│   ├── schema.sql                  # 18 tables, PG compatible
│   ├── migrations/
│   └── seeds/001_core.sql
├── docs/
│   ├── README.md
│   ├── INSTALLATION.md
│   ├── DEPLOYMENT.md
│   ├── API.md
│   ├── SECURITY.md
│   ├── BACKUP_RESTORE.md
│   └── FOLDER_STRUCTURE.md
├── tests/                          # jest scaffold ready
├── scripts/
├── .env.example
├── docker-compose.yml
├── Dockerfile
└── README.md

Design principles:
- Clear separation API / UI / DB
- Stateless API, easy to containerize
- All business logic server-side, validated
- Audit hooks on every mutating route
- Office scope injected centrally
