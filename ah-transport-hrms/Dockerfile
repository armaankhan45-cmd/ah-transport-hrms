FROM node:20-alpine
WORKDIR /app
# build deps for better-sqlite3
RUN apk add --no-cache python3 make g++
COPY backend/package*.json ./backend/
RUN cd backend && npm ci --only=production
COPY . .
RUN mkdir -p database backend/uploads
ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080
WORKDIR /app/backend
CMD ["node", "src/server.js"]
