# PayFlow Performance Test Report

## Test: Payment Creation Load Test

### Objective

Evaluate the performance, reliability, and response latency of the
PayFlow payment creation API under increasing concurrent load.

### Endpoint

POST /payments

### Tool

k6

### Environment

- Local WSL environment
- Node.js API
- Fastify
- PostgreSQL 17
- Docker Desktop
- 100 maximum virtual users

### Load Profile

The test gradually increased virtual users:

- 10 VUs for 10 seconds
- 25 VUs for 20 seconds
- 50 VUs for 20 seconds
- 100 VUs for 20 seconds
- 50 VUs for 20 seconds
- Ramp down to 0 over 10 seconds

### Performance Thresholds

- HTTP error rate < 1%
- p95 response time < 500 ms
- p99 response time < 1000 ms

### Results

| Metric | Result |
|---|---:|
| Maximum VUs | 100 |
| Total requests | 110,028 |
| Throughput | 1,098.10 req/s |
| Error rate | 0.00% |
| p95 latency | 85.98 ms |
| p99 latency | 123.41 ms |
| Checks passed | 330,084 / 330,084 |
| Check success rate | 100% |

### Assessment

All defined performance thresholds passed.

The payment creation endpoint maintained:

- 0% HTTP request failures
- p95 latency below 100 ms
- p99 latency below 150 ms
- 100% successful functional checks

### Important Limitation

These results represent a local development benchmark and should not
be interpreted as production capacity.

Production performance would also depend on infrastructure,
network latency, database configuration, connection pooling,
container resources, downstream services, and deployment topology.

### Next Steps

Future performance testing should include:

- sustained/soak testing
- stress testing beyond 100 VUs
- database performance monitoring
- downstream payment-provider latency
- webhook throughput
- refund and transaction lifecycle performance
