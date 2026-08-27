# PayFlow Quality Engineering

[![PayFlow Quality Gate](https://github.com/YannickAtabong9/payflow-quality-engineering/actions/workflows/quality-gate.yml/badge.svg)](https://github.com/YannickAtabong9/payflow-quality-engineering/actions/workflows/quality-gate.yml)

A production-style Quality Engineering project for a payment API, demonstrating API automation, database validation, integration testing, contract testing, security testing, performance testing, observability, and CI/CD quality gates.

## Overview

PayFlow simulates a payment platform supporting payment creation, processing, completion, refunds, idempotency protection, concurrency handling, PostgreSQL persistence, rate limiting, and operational monitoring.

The project demonstrates how quality engineering practices can be integrated throughout the software delivery lifecycle rather than treated only as end-stage testing.

## Tech Stack

**Application**
- Node.js
- TypeScript
- Fastify
- Zod
- PostgreSQL

**Testing**
- Playwright
- Ajv
- Swagger Parser
- k6

**Observability**
- Prometheus
- Grafana
- prom-client

**DevOps**
- Docker
- Docker Compose
- GitHub Actions

## Automated Test Coverage

The Playwright test suite currently contains **38 automated tests** covering:

- API functional testing
- Positive and negative scenarios
- Payment lifecycle validation
- PostgreSQL persistence validation
- Idempotency
- Concurrent duplicate requests
- Refund workflows
- OpenAPI contract validation
- API rate limiting
- Input security testing
- Secure error handling
- End-to-end integration testing

## Payment Lifecycle

```text
pending
   |
   v
processing
   |
   +------> failed
   |
   v
successful
   |
   v
refunded
```

The automated suite validates both successful workflows and invalid state transitions.

## API Endpoints

```text
GET  /health
GET  /health/db
GET  /metrics

POST /payments
GET  /payments/:id
POST /payments/:id/process
POST /payments/:id/complete
POST /payments/:id/refund
```

## Idempotency & Concurrency Testing

Payment creation requires an `Idempotency-Key`.

The test suite verifies that:

- Repeated identical requests return the same payment
- Reusing an idempotency key with different payment data returns `409 Conflict`
- Concurrent identical requests create only one database record
- PostgreSQL provides persistence-level protection against duplicate idempotency keys

## Security Testing

Security-focused automated coverage includes:

- API rate-limit enforcement
- Negative and zero amount validation
- Decimal amount rejection
- Type manipulation
- Unsupported currency validation
- Invalid email validation
- Malicious input handling
- Malformed JSON handling
- Secure error responses
- Prevention of database implementation-detail leakage
- Prevention of stack trace exposure

The `/payments` endpoint also implements API rate limiting, with automated tests verifying `429 Too Many Requests` responses after the configured limit is exceeded.

## Contract Testing

The OpenAPI specification is stored at:

```text
tests/contract/openapi.yaml
```

Contract tests validate the OpenAPI specification and verify actual API responses against the defined contract using Swagger Parser and Ajv.

## Database Validation

Automated tests query PostgreSQL directly to verify that API operations produce the expected persistent state.

The payment model includes:

```text
id
reference
amount
currency
customer_email
status
created_at
idempotency_key
request_hash
```

Database initialization is reproducible, allowing the same required schema to be created in both local development and clean CI environments.

## Performance Testing

k6 is used for API performance and load testing.

Performance test scripts:

```text
tests/performance/payment-creation.js
tests/performance/payment-load.js
```

The project includes baseline and load-testing scenarios, including scaling traffic up to **100 virtual users**.

Configured performance thresholds include:

```text
HTTP error rate < 1%
p95 latency < 500 ms
p99 latency < 1000 ms
```

Detailed performance results are documented in:

```text
tests/performance/performance-report.md
```

## Observability

The application exposes Prometheus metrics through:

```text
GET /metrics
```

Custom metrics include:

```text
payflow_http_requests_total
payflow_http_request_duration_seconds
payflow_payments_created_total
```

Prometheus collects application metrics while Grafana provides visualization of API reliability and performance.

Observable metrics include:

- API request rate
- HTTP error rate
- p95 API latency
- Payment creation rate
- Requests by HTTP status
- Request rate by endpoint

### PayFlow API Reliability Dashboard

![PayFlow API Reliability Dashboard](docs/screenshots/grafana-dashboard.png)

The Grafana dashboard provides visibility into API behavior during functional, integration, security, and performance testing, helping identify latency spikes, elevated error rates, traffic patterns, and payment activity.

## CI/CD Quality Gate

GitHub Actions automatically executes the quality gate on repository changes.

The pipeline performs:

```text
Checkout Repository
        |
        v
Initialize Containers
        |
        v
Setup Node.js
        |
        v
Install Dependencies
        |
        v
Initialize PostgreSQL
        |
        v
Build TypeScript
        |
        v
Start PayFlow API
        |
        v
Wait for API Health
        |
        v
Run Automated Test Suite
        |
        v
      PASS / FAIL
```

On test failure, CI uploads Playwright reports and API logs as artifacts to support debugging.

## Project Structure

```text
.
├── .github/
│   └── workflows/
│       └── quality-gate.yml
├── docs/
│   └── screenshots/
│       └── grafana-dashboard.png
├── monitoring/
│   └── prometheus/
│       └── prometheus.yml
├── src/
│   ├── config/
│   │   ├── database.ts
│   │   ├── init-db.ts
│   │   └── metrics.ts
│   ├── routes/
│   │   └── payment.routes.ts
│   ├── schemas/
│   │   └── payment.schema.ts
│   ├── types/
│   │   └── payment.ts
│   └── server.ts
├── tests/
│   ├── api/
│   ├── clients/
│   ├── contract/
│   ├── factories/
│   ├── helpers/
│   ├── integration/
│   ├── performance/
│   └── security/
├── docker-compose.yml
├── package.json
├── playwright.config.ts
└── tsconfig.json
```

## Running the Project Locally

### 1. Clone the repository

```bash
git clone https://github.com/YannickAtabong9/payflow-quality-engineering.git
cd payflow-quality-engineering
```

### 2. Install dependencies

```bash
npm install
```

### 3. Start the infrastructure

```bash
docker compose up -d
```

### 4. Initialize the database

```bash
npm run db:init
```

### 5. Start the PayFlow API

```bash
npm run dev
```

The API runs on:

```text
http://127.0.0.1:3000
```

### 6. Run the automated test suite

In another terminal:

```bash
npm test
```

### 7. View the Playwright HTML report

```bash
npx playwright show-report
```

## Running Performance Tests

Baseline performance test:

```bash
k6 run tests/performance/payment-creation.js
```

Load test:

```bash
k6 run tests/performance/payment-load.js
```

## Monitoring

When the monitoring stack is running:

- PayFlow API: `http://localhost:3000`
- Prometheus: `http://localhost:9090`
- Grafana: `http://localhost:3001`

## Quality Engineering Practices Demonstrated

This project demonstrates practical implementation of:

- API-first test automation
- Layered automated testing
- Reusable API clients
- Test data factories
- Database assertions
- Idempotency testing
- Concurrency testing
- API contract testing
- Security-focused QA
- Performance engineering
- Prometheus-based observability
- Reproducible test environments
- CI/CD quality gates
- Automated failure artifact collection

## CI Status

The PayFlow Quality Gate runs automatically through GitHub Actions and validates the application in a clean CI environment using PostgreSQL and the complete automated test suite.

A successful pipeline confirms that the application builds correctly, the database initializes successfully, the API becomes healthy, and all automated quality checks pass.
