FROM node:24-alpine AS builder
WORKDIR /app
COPY . .
RUN corepack enable && corepack prepare pnpm@10.30.3 --activate && pnpm install --frozen-lockfile
ARG SERVICE=web
RUN pnpm --filter @chonghub/${SERVICE} build
COPY ops/deploy/entrypoint.sh /usr/local/bin/chonghub-entrypoint
RUN chmod 0555 /usr/local/bin/chonghub-entrypoint

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
COPY --from=builder /usr/local/bin/chonghub-entrypoint /usr/local/bin/chonghub-entrypoint
EXPOSE ${PORT}
ENTRYPOINT ["/usr/local/bin/chonghub-entrypoint"]
CMD ["sh", "-c", "exec node apps/${SERVICE}/server.js"]
