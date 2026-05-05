# Distributed Log Reconciliation System

A complete full-stack Next.js 14 application for uploading distributed service logs, normalizing timestamps to UTC, detecting anomalies, reconstructing a causal timeline, and assigning confidence scores.

## Tech Stack

- Next.js 14 App Router
- TypeScript
- Tailwind CSS
- MongoDB Atlas with the native MongoDB driver
- Next.js API routes
- Vercel-ready configuration

## Features

- Upload JSON and CSV log files.
- Upload newline-delimited JSON logs that use `service`, `timestamp`, and `message` fields.
- Simulated sources: Auth Service, Payment Service, Notification Service, Inventory Service.
- Reconciliation pipeline:
  - timestamp normalization to UTC
  - duplicate detection
  - missing sequence detection
  - out-of-order detection
  - causal timeline reconstruction
  - confidence score assignment
- Modern dark dashboard with source cards, processing state, filters, timeline, confidence badges, and anomaly insights.

## API Routes

- `POST /api/upload` accepts multipart form data with a `file` field.
- `POST /api/process` reruns reconciliation on stored logs.
- `GET /api/timeline?source=all` returns logs, source stats, and anomaly insights.

## Database Schema

```ts
type Log = {
  source: string;
  event: string;
  rawTimestamp: string;
  normalizedTimestamp: string;
  metadata: Record<string, unknown>;
  confidence: number;
  status: "normal" | "duplicate" | "missing" | "out-of-order" | "causal-gap";
};
```

Additional fields such as `eventId`, `correlationId`, and `sequence` are stored when present to improve reconciliation quality.

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Create `.env.local`:

```bash
MONGODB_URI=mongodb+srv://USER:PASSWORD@cluster.mongodb.net/distributed-log-reconciliation
MONGODB_DB=distributed-log-reconciliation
```

3. Run the app:

```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000).

Sample upload files are included at `sample-logs.json`, `sample-logs.csv`, and `sample-logs.ndjson`.

## Deploying to Vercel

Add `MONGODB_URI` and `MONGODB_DB` to the Vercel project environment variables, then deploy normally. The app uses Node.js API route runtime for MongoDB compatibility.
