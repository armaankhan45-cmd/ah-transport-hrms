# Deployment Guide – Production

## Architecture
- Single Node.js Express app serving API + static SPA
- SQLite WAL (easy) – upgrade path to PostgreSQL: schema.sql is PG compatible
- Stateless JWT – horizontal scale ready, add Redis later for revocation
- Behind Nginx TLS terminator

## Docker
```
docker build -t ah-hrms:1.0 .
docker run -d -p 8080:8080 -v hrms_data:/app/database -e JWT_SECRET=... --name hrms ah-hrms:1.0
```
See docker-compose.yml

## Nginx Reverse Proxy
```
server {
  listen 443 ssl http2;
  server_name hrms.ahtransport.co.in;
  ssl_certificate /etc/ssl/certs/ah.crt;
  ssl_certificate_key /etc/ssl/private/ah.key;
  client_max_body_size 10m;
  location / {
    proxy_pass http://127.0.0.1:8080;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto https;
  }
}
```

## Systemd
```
/etc/systemd/system/ah-hrms.service
[Unit]
Description=AH Transport HRMS
After=network.target
[Service]
WorkingDirectory=/opt/ah-transport-hrms/backend
ExecStart=/usr/bin/node src/server.js
Environment=NODE_ENV=production
Restart=always
User=hrms
[Install]
WantedBy=multi-user.target
```

## PostgreSQL Migration Path
schema.sql uses standard types. To migrate:
1. pgloader sqlite → postgres
2. Update backend/src/db/database.js to use pg Pool
3. All queries are ANSI-SQL compatible

## Scaling 1000+ employees
- Enable PM2 cluster: `pm2 start src/server.js -i max`
- Move SQLite → PostgreSQL at ~500 concurrent users
- Add Redis cache for dashboard stats (TTL 60s)
- CDN for static frontend

## Backups
See BACKUP_RESTORE.md – hourly SQLite WAL copy + nightly full.

## Monitoring
- Health: /api/health
- Logs: winston JSON to stdout – ship to Loki/ELK
- Uptime: Uptime Kuma check /api/health every 60s
