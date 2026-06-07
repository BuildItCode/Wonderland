# syntax=docker/dockerfile:1

# ---- build stage: compile TypeScript + copy the static console into dist ----
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json copy-public.mjs ./
COPY src ./src
RUN npm run build

# ---- runtime stage: production deps + compiled output only ----
FROM node:24-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
# default location for the SQLite file; mount a volume here in production to persist rooms
RUN mkdir -p /app/data
ENV DATABASE_PATH=/app/data/wonderland.sqlite
EXPOSE 4000
CMD ["node", "dist/index.js"]
