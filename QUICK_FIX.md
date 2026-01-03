# Quick Fix for Docker Image Pull Error

## The Problem
Docker cannot connect to Docker Hub's Cloudflare CDN to download images. This is a network/firewall issue.

## Quick Solutions (Try These First)

### Option 1: Disable IPv6 in Docker (Recommended)

1. **Open Docker Desktop**
2. **Go to Settings → Docker Engine**
3. **Add this configuration:**
   ```json
   {
     "ipv6": false,
     "fixed-cidr-v6": ""
   }
   ```
4. **Click "Apply & Restart"**
5. **Wait for Docker to restart**
6. **Try again:**
   ```bash
   docker pull postgres:15
   docker pull node:18-alpine
   docker-compose up -d
   ```

### Option 2: Configure DNS

1. **Open Docker Desktop**
2. **Go to Settings → Docker Engine**
3. **Add DNS servers:**
   ```json
   {
     "dns": ["8.8.8.8", "1.1.1.1"]
   }
   ```
4. **Click "Apply & Restart"**
5. **Try again**

### Option 3: Use VPN or Different Network

- Try connecting to a different network (mobile hotspot)
- Use a VPN if you're on a restricted network
- Check if your ISP/firewall blocks Cloudflare

### Option 4: Run Locally (No Docker Required)

If Docker continues to fail, you can run the application locally:

#### Install PostgreSQL
1. Download from: https://www.postgresql.org/download/windows/
2. Install and create database: `CREATE DATABASE saas_db;`

#### Run Backend
```bash
cd backend
npm install

# Create .env file:
# DB_HOST=localhost
# DB_PORT=5432
# DB_NAME=saas_db
# DB_USER=postgres
# DB_PASSWORD=postgres
# JWT_SECRET=your_super_secret_jwt_key_min_32_characters_long
# JWT_EXPIRES_IN=24h
# PORT=5000
# FRONTEND_URL=http://localhost:3000

npm run migrate
npm run seed
npm start
```

#### Run Frontend (new terminal)
```bash
cd frontend
npm install

# Create .env file:
# VITE_API_URL=http://localhost:5000/api

npm run dev
```

Then open: http://localhost:3000

### Option 5: Wait and Retry

Sometimes Docker Hub/CDN has temporary issues. Try again in 10-15 minutes.

## Most Likely Fix: Disable IPv6

The error shows an IPv6 address `[2606:4700:2ff9::1]`, which suggests IPv6 connectivity issues. Disabling IPv6 in Docker (Option 1) usually resolves this.

