# Build-time secrets — must match the GitHub Actions workflow that passes them in.
ARG NEXTAUTH_SECRET
ARG BETTER_AUTH_SECRET
ARG ENCRYPTION_KEY
ARG DATABASE_URL

FROM node:20-alpine
WORKDIR /app
RUN apk add --no-cache openssl && \
    addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown nodejs:nodejs /app
USER nodejs

COPY --chown=nodejs:nodejs package*.json ./
RUN npm ci

COPY --chown=nodejs:nodejs prisma ./prisma/
RUN npx prisma generate

COPY --chown=nodejs:nodejs . .

# Pass every secret the env validator requires. Without these the build
# crashes at `import "./lib/env"` inside next.config.ts.
RUN NEXTAUTH_SECRET=${NEXTAUTH_SECRET} \
    BETTER_AUTH_SECRET=${BETTER_AUTH_SECRET} \
    ENCRYPTION_KEY=${ENCRYPTION_KEY} \
    DATABASE_URL=${DATABASE_URL} \
    npm run build

EXPOSE 3000
CMD ["npm", "start"]
