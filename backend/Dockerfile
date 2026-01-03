FROM node:18-alpine

WORKDIR /app

# Install wget for health check
RUN apk add --no-cache wget

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy application code
COPY . .

# Expose port
EXPOSE 5000

# Run migrations, seeds, then start server
CMD ["sh", "-c", "node scripts/runMigrations.js && node scripts/seedDatabase.js && node server.js"]


