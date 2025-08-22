# Install dependencies and build
FROM node:18-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci || npm install
COPY . .
RUN npm run build

# Production image
FROM node:18-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/public ./public
ENV NEXT_PUBLIC_GRAPHQL_URL=http://localhost:4000
ENV INTERNAL_GRAPHQL_URL=http://api-gateway:4000
EXPOSE 3000
CMD ["npm", "start"]
