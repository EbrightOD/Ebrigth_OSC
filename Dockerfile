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

# Skip the env validator at build time — none of these secrets are inlined
# into the bundle, so the build doesn't need real values. The runtime
# container still validates them at startup via env_file.
RUN SKIP_ENV_VALIDATION=1 \
    NEXTAUTH_SECRET=${NEXTAUTH_SECRET} \
    BETTER_AUTH_SECRET=${BETTER_AUTH_SECRET} \
    ENCRYPTION_KEY=${ENCRYPTION_KEY} \
    DATABASE_URL=${DATABASE_URL} \
    npm run build

EXPOSE 3000
CMD ["npm", "start"]
