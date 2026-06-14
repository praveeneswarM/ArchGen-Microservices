# ==========================================
# STAGE 1: Dependency Installation & Build
# ==========================================
FROM node:20-slim AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Build the Next.js bundle
RUN npm run build

# ==========================================
# STAGE 2: Production Runtime
# ==========================================
FROM node:20-slim AS runner

WORKDIR /app

# Enable production environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.js ./

EXPOSE 3000

CMD ["npm", "run", "start"]
