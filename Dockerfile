# Use official Node 24 image as base
FROM node:24-bullseye

# Install jq (used in coverage step)
RUN apt-get update && apt-get install -y jq && rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /app

# ---- Install dependencies for frontend & backend ----
# Copy only package files first so Docker can cache npm ci layers

# Frontend deps
COPY frontend/package*.json ./frontend/
WORKDIR /app/frontend
RUN npm ci

# Backend deps
COPY /backend/package*.json ../backend/
WORKDIR /app/backend
RUN npm ci

# ---- Copy the rest of the repo (source code, tests, etc.) ----
WORKDIR /app
COPY . .

# Default command (GitHub Actions will override this with `run:` steps)
CMD ["bash"]
