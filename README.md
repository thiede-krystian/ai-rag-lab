# AI RAG Lab

Local Next.js and Node.js demo for an AI Engineer workflow:
document ingestion, embeddings, vector search, RAG chat, prompt scoring, and evals.

## Stack

- Next.js App Router
- TypeScript
- Mantine UI
- Qdrant
- OpenRouter embeddings
- OpenRouter chat completions

## Development

```bash
cp .env.example .env.local
pnpm install
pnpm dev
```

Qdrant runs locally with:

```bash
docker compose up -d
```

## Milestones

1. UI scaffold with Mantine
2. Domain types, seed data, chunking, unit tests
3. Qdrant collection, OpenRouter embeddings, ingestion, search
4. OpenRouter RAG chat and CV-job match scoring
5. Eval runner and dashboard

## Embedding Profiles

- `balanced`: `text-embedding-3-small`, 1536 dimensions
- `large`: `text-embedding-3-large`, 3072 dimensions

Changing profiles requires a Qdrant collection reset because vector dimensions
must match the collection configuration. The app exposes a reset action in the
Documents tab and also resets before seed ingestion.
