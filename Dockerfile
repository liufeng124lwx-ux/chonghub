FROM node:24-alpine AS builder
WORKDIR /app
COPY . .
RUN corepack enable && pnpm install --frozen-lockfile
ARG SERVICE=web
RUN pnpm --filter @chonghub/${SERVICE} build

FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ARG SERVICE=web
ENV SERVICE=${SERVICE}
ARG PORT=3000
ENV PORT=${PORT}
COPY --from=builder /app/apps/${SERVICE}/.next-build/standalone ./
COPY --from=builder /app/apps/${SERVICE}/.next-build/static ./apps/${SERVICE}/.next-build/static
COPY --from=builder /app/public ./apps/${SERVICE}/public
EXPOSE ${PORT}
CMD ["sh", "-c", "exec node apps/${SERVICE}/server.js"]
