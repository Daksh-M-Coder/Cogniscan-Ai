FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Build TypeScript
RUN npm run build

# Create non-root user
RUN addgroup -g 1000 -S nodejs && adduser -S nodejs -u 1000
USER nodejs

EXPOSE 3000

CMD ["node", "dist/index.js"]
