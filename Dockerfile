# Build stage
FROM --platform=$BUILDPLATFORM node:18-alpine as builder

WORKDIR /usr/src/app

# Install dependencies first (better layer caching)
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Build the application using npx
RUN npx nest build

# Production stage
FROM --platform=$TARGETPLATFORM node:18-alpine

WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install production dependencies
RUN npm install --only=production

# Copy built application from builder stage
COPY --from=builder /usr/src/app/dist ./dist

EXPOSE 3000

# Use node directly instead of npm for better signal handling
CMD ["node", "dist/main"]