# Dockerfile - Multi-stage build for Zetass POS
FROM node:20-alpine AS builder
WORKDIR /app
RUN apk add --no-cache python3 make g++
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/shared-lib/package.json packages/shared-lib/
COPY packages/zetass-pos-user/package.json packages/zetass-pos-user/
COPY packages/zetass-pos-developer-panel/package.json packages/zetass-pos-developer-panel/
RUN corepack enable && pnpm install --frozen-lockfile
COPY . .
RUN npm run build:desktop

FROM node:20-alpine AS runner
WORKDIR /app
RUN apk add --no-cache python3 make g++ sqlite
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/dist-electron ./dist-electron
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
EXPOSE 5173
CMD ["node", "dist-electron/main/index.js"]
