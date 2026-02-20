# Microservice Migration Plan

This project is intentionally built as a **modular monolith** with clear domain boundaries so it can evolve safely.

---

## Why not microservices from day 1?
- Higher operational complexity
- Harder local dev + debugging
- Overhead for small team / v1 delivery

Instead: **evolve based on metrics and bottlenecks**.

---

## Phase 1 — Extract Notification Service
Goal: decouple non-critical async tasks.

- Keep API monolith
- Add outbox table + worker
- Notification delivery reads outbox events

Benefits:
- retries + idempotency
- reduced synchronous latency

---

## Phase 2 — Extract Approval Execution Worker / Service
Goal: isolate sensitive execution logic.

- approval decisions still via API
- execution becomes async service
- strong idempotency guarantees

---

## Phase 3 — Introduce Message Broker
When throughput requires:
- Kafka / RabbitMQ / Redis Streams
- DLQ for poison messages
- replay support

---

## Phase 4 — Extract Document Service
- metadata service + storage service boundary
- presigned uploads become default
- content scanning pipeline optional (AV/OCR)

---

## Phase 5 — API Gateway + Service Discovery
- unified auth, rate limiting
- routing to internal services

---

## Operational Requirements (as you scale)
- centralized logging + tracing
- SLOs + alerting
- versioned event contracts
