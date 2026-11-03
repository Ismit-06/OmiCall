# Couple-Focused Video Calling & Social Random Chat Platform

A full-stack web application designed for private one-on-one video calls (for couples, close friends) and interest-based random matching, built on Spring Boot, React, and LiveKit.

## Project Structure
- `web/`: Frontend built with React, Vite, TypeScript, and LiveKit Client.
- `api/`: Backend built with Java 17, Spring Boot, Spring Security (OAuth2), Spring Data JPA, and Flyway.
- `infra/`: Supporting infrastructure and configuration templates.
- `docs/`: Architecture notes, API specifications, and test plans.

## Quick Start (Local Development)

### 1. Prerequisites
- Java 17+
- Node.js 18+ and npm
- Maven 3.8+
- Docker & Docker Compose (or local PostgreSQL 16)

### 2. Environment Configuration
Copy `.env.example` to `.env` in the root and configure credentials:
```bash
cp .env.example .env
```

### 3. Run Infrastructure
```bash
docker compose up -d
```

### 4. Run Backend (`api/`)
```bash
cd api
mvn spring-boot:run
```
Default URL: `http://localhost:8080`
Health Endpoint: `http://localhost:8080/api/health`

### 5. Run Frontend (`web/`)
```bash
cd web
npm install
npm run dev
```
Default URL: `http://localhost:5173`
