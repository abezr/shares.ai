# Builder stage
FROM node:18-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
COPY tsconfig.json ./
COPY schema.graphql ./
COPY src ./src
RUN npm ci || npm install
RUN npm run build

# Production stage
FROM node:18-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/schema.graphql ./schema.graphql
COPY package.json ./
EXPOSE 4000
CMD ["node", "dist/src/index.js"]
