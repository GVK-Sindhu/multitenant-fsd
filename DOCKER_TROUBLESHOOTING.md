# Docker Troubleshooting Guide

## Issue: Cannot Pull Docker Images (Network Connectivity Error)

If you're getting errors like:
```
failed to copy: httpReadSeeker: failed open: failed to do request: Get "https://docker-images-prod...
dial tcp: connectex: A connection attempt failed...
```

This is a network connectivity issue preventing Docker from downloading images from Docker Hub.

## Solutions (Try in Order)

### Solution 1: Pull Images Manually First

Try pulling the base images manually before running docker-compose:

```bash
# Pull PostgreSQL image
docker pull postgres:15

# Pull Node.js image
docker pull node:18-alpine

# Then run docker-compose
docker-compose up -d
```

### Solution 2: Check Docker Desktop Settings

1. **Open Docker Desktop**
2. **Go to Settings → Resources → Network**
3. **Check if you're using a proxy** - if so, configure it properly
4. **Try disabling VPN/proxy temporarily** to test

### Solution 3: Configure Docker DNS

1. **Open Docker Desktop**
2. **Go to Settings → Docker Engine**
3. **Add DNS configuration:**
   ```json
   {
     "dns": ["8.8.8.8", "8.8.4.4"]
   }
   ```
4. **Click "Apply & Restart"**

### Solution 4: Check Firewall/Antivirus

- Temporarily disable Windows Firewall or add Docker to exceptions
- Check if antivirus is blocking Docker connections
- Allow Docker Desktop through Windows Firewall

### Solution 5: Use Different Network Connection

- Try switching networks (WiFi to Ethernet or vice versa)
- Try mobile hotspot to test if it's network-specific
- Check if your network blocks Docker Hub

### Solution 6: Restart Docker Desktop

```bash
# Completely restart Docker Desktop
# Close Docker Desktop completely
# Reopen Docker Desktop
# Wait for it to fully start
# Then try again
```

### Solution 7: Clear Docker Cache and Retry

```bash
# Clean up Docker system
docker system prune -a

# Then try pulling images again
docker pull postgres:15
docker pull node:18-alpine
```

### Solution 8: Use Alternative Registry (If Docker Hub is Blocked)

If Docker Hub is blocked in your region, you can try:

1. Use a VPN to connect to a different region
2. Use a Docker Hub mirror if available
3. Use alternative base images from other registries

### Solution 9: Check Corporate Proxy/VPN

If you're on a corporate network:
- Configure Docker to use the corporate proxy
- Ask IT to whitelist Docker Hub domains
- Use a VPN that allows Docker Hub access

## Alternative: Run Without Docker (Local Development)

If Docker continues to fail, you can run the application locally without Docker:

### Step 1: Install PostgreSQL Locally

1. Download and install PostgreSQL 15 from https://www.postgresql.org/download/
2. Create database:
   ```sql
   CREATE DATABASE saas_db;
   ```

### Step 2: Run Backend Locally

```bash
cd backend
npm install

# Create .env file with:
# DB_HOST=localhost
# DB_PORT=5432
# DB_NAME=saas_db
# DB_USER=postgres
# DB_PASSWORD=your_password
# JWT_SECRET=your_super_secret_jwt_key_min_32_characters_long
# JWT_EXPIRES_IN=24h
# PORT=5000
# NODE_ENV=development
# FRONTEND_URL=http://localhost:3000

npm run migrate
npm run seed
npm start
```

### Step 3: Run Frontend Locally

```bash
# In a new terminal
cd frontend
npm install

# Create .env file with:
# VITE_API_URL=http://localhost:5000/api

npm run dev
```

## Verify Docker Connectivity

Test if Docker can reach Docker Hub:

```bash
# Test connectivity
docker pull hello-world

# If this works, try the application images
docker pull postgres:15
docker pull node:18-alpine
```

## Still Having Issues?

If none of the above work:
1. Check Docker Desktop logs: Help → Troubleshoot → View Logs
2. Check Windows Event Viewer for network errors
3. Try updating Docker Desktop to the latest version
4. Check Docker Hub status: https://status.docker.com/

## Quick Test Commands

```bash
# Check Docker is running
docker --version
docker ps

# Check if images can be pulled
docker pull hello-world

# Check docker-compose
docker-compose --version

# Check network connectivity
ping hub.docker.com
```

