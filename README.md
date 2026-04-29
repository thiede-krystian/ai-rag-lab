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
2. Domain types, chunking, unit tests
3. Qdrant collection, OpenRouter embeddings, ingestion, search
4. OpenRouter RAG chat and CV-job match scoring
5. Searchable PDF import and manual text documents with append/replace modes
6. Qdrant document inventory and PDF retrieval evals

## Embedding Profiles

- `balanced`: `text-embedding-3-small`, 1536 dimensions
- `large`: `text-embedding-3-large`, 3072 dimensions

Changing profiles requires a Qdrant collection reset because vector dimensions
must match the collection configuration. The app exposes a reset action in the
Documents tab and `Replace all` resets before importing a PDF or text document.

## Text Documents

The Documents tab supports adding one text document at a time through `Add text`.
Use it for a pasted CV, job offer, or knowledge note while the future WYSIWYG
editor is still out of scope.

Manual text documents use the same `/api/ingest` pipeline as future editor
content: chunking, OpenRouter embeddings, and Qdrant upsert.

## PDF Import

The Documents tab supports importing searchable PDFs, such as a text-based CV.
Scanned PDFs are intentionally out of scope for v1 because they require OCR.

Import modes:

- `Append`: adds the imported PDF chunks to the current Qdrant collection.
- `Replace all`: resets the Qdrant collection for the selected embedding profile,
  then imports only the selected PDF.

Manual check:

1. Start Qdrant with `docker compose up -d`.
2. Start the app with `pnpm dev`.
3. Open `http://localhost:3000` and go to Documents.
4. Click Add text for pasted content or Import PDF for a searchable PDF.
5. Choose source type (`cv`, `job`, or `knowledge`), tags, embedding profile,
   and Append or Replace all.
6. Search for a skill or phrase from the document in Semantic Search.
7. In Evals, choose the imported document and run retrieval evals.

## RAG Chat And Scoring

RAG Chat uses the current Qdrant collection, so it can answer questions based on
an imported PDF after the document is indexed.

Score match uses the current Qdrant collection too. Import or add one document
as `cv` and one as `job`, then choose both titles in the RAG Chat tab. The API
loads matching chunks by `sourceType + title`, joins them in chunk order,
extracts a job-specific rubric from the selected job description, and then asks
OpenRouter to score the CV against that rubric.

The generic `/api/ingest` endpoint remains available for future WYSIWYG import
flows. It requires an explicit `documents` array and no longer indexes fallback
demo data.

## Evals

The Evals tab is focused on imported or explicitly added documents. Choose the
expected document title, source type, TopK, and one query per line. The app
reports whether each query retrieved the expected document title in TopK, plus
Recall@K, MRR, latency, and pass rate.

Automated checks:

```bash
pnpm lint
pnpm test
pnpm build
```

## Deployment Environments

Qdrant connection is selected from environment variables:

- `QDRANT_TARGET=auto`: default; uses cloud when `QDRANT_API_KEY` or Vercel env is present,
  otherwise local Docker Qdrant.
- `QDRANT_TARGET=local`: force local Qdrant.
- `QDRANT_TARGET=cloud`: force Qdrant Cloud.

Local Docker setup:

```txt
QDRANT_TARGET=local
QDRANT_LOCAL_URL=http://localhost:6333
QDRANT_COLLECTION=ai_rag_lab_documents
```

Vercel + Qdrant Cloud setup:

```txt
QDRANT_TARGET=cloud
QDRANT_CLOUD_URL=https://your-cluster.region.cloud-provider.cloud.qdrant.io:6333
QDRANT_API_KEY=your-database-api-key
QDRANT_COLLECTION=ai_rag_lab_documents
```

Never commit real API keys to the repository. Store production values in Vercel
Project Settings -> Environment Variables.
