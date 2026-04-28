"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import type { DriveStep, Driver } from "driver.js";
import {
  isProductTourAutoDisabled,
  markProductTourSeen,
  shouldAutoStartProductTour,
} from "@/lib/tour-state";

export type TourTab = "documents" | "cv" | "search" | "chat" | "evals";

type ProductTourProps = {
  activeTab: TourTab;
  onAutoDisabledChange: (disabled: boolean) => void;
  runId: number;
  setActiveTab: (tab: TourTab) => void;
};

type ProductTourStep = {
  align?: "start" | "center" | "end";
  description: string;
  side?: "top" | "right" | "bottom" | "left" | "over";
  tab: TourTab;
  target: string;
  title: string;
};

const AUTO_START_DELAY_MS = 650;
const TAB_RENDER_DELAY_MS = 170;

const TOUR_STEPS: ProductTourStep[] = [
  {
    target: "app-header",
    tab: "documents",
    title: "AI RAG Lab",
    description:
      "This demo shows a local AI Engineer workflow: documents, embeddings, Qdrant retrieval, RAG answers, CV-job scoring, and retrieval evals.",
    side: "bottom",
    align: "start",
  },
  {
    target: "qdrant-target",
    tab: "documents",
    title: "Active Qdrant target",
    description:
      "This badge shows whether the app is indexing and searching against local Qdrant or Qdrant Cloud from the current environment.",
    side: "bottom",
  },
  {
    target: "guide-menu",
    tab: "documents",
    title: "Guide controls",
    description:
      "Use this menu to restart the walkthrough manually or disable the automatic first-visit guide.",
    side: "bottom",
    align: "end",
  },
  {
    target: "documents-metrics",
    tab: "documents",
    title: "Indexed document inventory",
    description:
      "These metrics summarize what is currently stored in Qdrant: grouped documents and indexed chunks.",
    side: "bottom",
  },
  {
    target: "embedding-profile",
    tab: "documents",
    title: "Embedding profile",
    description:
      "The profile controls the embedding model and vector dimensions. Keep one profile per Qdrant collection.",
    side: "bottom",
  },
  {
    target: "collection-actions",
    tab: "documents",
    title: "Collection actions",
    description:
      "Refresh reloads the Qdrant inventory. Reset recreates the collection for the selected embedding profile.",
    side: "bottom",
  },
  {
    target: "add-text-button",
    tab: "documents",
    title: "Add text",
    description:
      "Paste a CV, job offer, or knowledge note directly into the app and index it as chunks with embeddings.",
    side: "bottom",
  },
  {
    target: "import-pdf-button",
    tab: "documents",
    title: "Import PDF",
    description:
      "Upload a searchable PDF, extract its text, chunk it, embed it, and upsert the chunks into Qdrant.",
    side: "bottom",
  },
  {
    target: "documents-table",
    tab: "documents",
    title: "Documents table",
    description:
      "This table is built from Qdrant payloads and shows real indexed documents, their source type, chunks, and tags.",
    side: "top",
  },
  {
    target: "tab-cv",
    tab: "cv",
    title: "CV Maker",
    description:
      "CV Maker extracts text from a searchable CV PDF, turns it into an editable draft, and exports a new CV.",
    side: "bottom",
  },
  {
    target: "cv-import",
    tab: "cv",
    title: "CV PDF import",
    description:
      "This import is separate from Qdrant. It only extracts text for editing and keeps the draft in this browser.",
    side: "bottom",
  },
  {
    target: "cv-editor",
    tab: "cv",
    title: "Structured editor",
    description:
      "Edit personal info, summary, skills, experience, projects, education, certifications, and languages.",
    side: "top",
  },
  {
    target: "cv-ai",
    tab: "cv",
    title: "AI parse",
    description:
      "Optionally send the extracted CV text to OpenRouter to improve the structure of the editable draft.",
    side: "bottom",
  },
  {
    target: "cv-export",
    tab: "cv",
    title: "Export CV",
    description:
      "Download Markdown in the browser or generate a clean A4 PDF from the structured CV draft.",
    side: "bottom",
  },
  {
    target: "tab-search",
    tab: "search",
    title: "Semantic Search",
    description:
      "Search uses an embedding of your query to retrieve the most semantically similar chunks from Qdrant.",
    side: "bottom",
  },
  {
    target: "search-form",
    tab: "search",
    title: "Search query and TopK",
    description:
      "Write the intent you want to find and choose how many chunks Qdrant should return.",
    side: "bottom",
  },
  {
    target: "search-button",
    tab: "search",
    title: "Run search",
    description:
      "This sends the query embedding to Qdrant and returns ranked chunks with similarity scores.",
    side: "bottom",
  },
  {
    target: "search-results",
    tab: "search",
    title: "Search results",
    description:
      "Each result shows the source document, source type, chunk index, text, and vector similarity score.",
    side: "top",
  },
  {
    target: "tab-chat",
    tab: "chat",
    title: "RAG Chat",
    description:
      "RAG first retrieves context chunks, then sends them with your question to the chat model.",
    side: "bottom",
  },
  {
    target: "chat-form",
    tab: "chat",
    title: "Question, prompt, TopK",
    description:
      "Choose a prompt version, set retrieval depth, and ask a question grounded in indexed documents.",
    side: "bottom",
  },
  {
    target: "chat-button",
    tab: "chat",
    title: "Ask",
    description:
      "The app runs search, builds a prompt with citations, and requests an answer from OpenRouter chat.",
    side: "bottom",
  },
  {
    target: "retrieved-context",
    tab: "chat",
    title: "Retrieved context",
    description:
      "This JSON preview makes the RAG pipeline inspectable: you can see exactly which chunks were used.",
    side: "top",
  },
  {
    target: "match-card",
    tab: "chat",
    title: "CV-job match",
    description:
      "Select one CV document and one Job document from Qdrant, then score the fit with an LLM prompt.",
    side: "top",
  },
  {
    target: "score-match-button",
    tab: "chat",
    title: "Score match",
    description:
      "This compares the selected documents and returns a 0-100 score, strengths, gaps, and a summary.",
    side: "bottom",
  },
  {
    target: "tab-evals",
    tab: "evals",
    title: "Evals",
    description:
      "Quick evals check whether retrieval finds the expected document for a small set of test queries.",
    side: "bottom",
  },
  {
    target: "evals-form",
    tab: "evals",
    title: "Eval setup",
    description:
      "Pick the expected document, source type, TopK, and one query per line for retrieval validation.",
    side: "bottom",
  },
  {
    target: "run-evals-button",
    tab: "evals",
    title: "Run evals",
    description:
      "The app searches for every query and calculates Recall@K, MRR, pass rate, and average latency.",
    side: "bottom",
  },
  {
    target: "evals-results",
    tab: "evals",
    title: "Eval results",
    description:
      "Results show whether the expected document appeared in TopK, at which rank, and how long retrieval took.",
    side: "top",
  },
];

export function ProductTour({
  activeTab,
  onAutoDisabledChange,
  runId,
  setActiveTab,
}: ProductTourProps) {
  const activeTabRef = useRef(activeTab);
  const driverRef = useRef<Driver | null>(null);
  const isMountedRef = useRef(false);
  const isMovingRef = useRef(false);
  const lastRunIdRef = useRef(runId);

  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

  const driverSteps = useMemo<DriveStep[]>(
    () =>
      TOUR_STEPS.map((step) => ({
        element: () => document.querySelector(`[data-tour="${step.target}"]`) ?? document.body,
        popover: {
          align: step.align,
          description: step.description,
          side: step.side,
          title: step.title,
        },
      })),
    [],
  );

  const markSeen = useCallback(() => {
    markProductTourSeen(window.localStorage);
  }, []);

  const moveToStep = useCallback(
    (driverInstance: Driver, direction: 1 | -1) => {
      if (isMovingRef.current) {
        return;
      }

      const activeIndex = driverInstance.getActiveIndex() ?? 0;
      const nextIndex = activeIndex + direction;

      if (nextIndex < 0) {
        return;
      }

      if (nextIndex >= TOUR_STEPS.length) {
        markSeen();
        driverInstance.destroy();
        return;
      }

      const nextStep = TOUR_STEPS[nextIndex];
      const needsTabChange = activeTabRef.current !== nextStep.tab;

      isMovingRef.current = true;
      setActiveTab(nextStep.tab);

      window.setTimeout(
        () => {
          if (!driverInstance.isActive()) {
            isMovingRef.current = false;
            return;
          }

          driverInstance.moveTo(nextIndex);
          driverInstance.refresh();
          isMovingRef.current = false;
        },
        needsTabChange ? TAB_RENDER_DELAY_MS : 0,
      );
    },
    [markSeen, setActiveTab],
  );

  const startTour = useCallback(async () => {
    if (typeof window === "undefined") {
      return;
    }

    driverRef.current?.destroy();
    setActiveTab("documents");

    await waitForTabRender();

    if (!isMountedRef.current) {
      return;
    }

    const { driver } = await import("driver.js");
    const driverInstance = driver({
      allowClose: true,
      animate: true,
      doneBtnText: "Done",
      nextBtnText: "Next",
      onCloseClick: (_element, _step, { driver: currentDriver }) => {
        markSeen();
        currentDriver.destroy();
      },
      onDestroyed: () => {
        markSeen();
        driverRef.current = null;
        isMovingRef.current = false;
      },
      onNextClick: (_element, _step, { driver: currentDriver }) => {
        moveToStep(currentDriver, 1);
      },
      onPrevClick: (_element, _step, { driver: currentDriver }) => {
        moveToStep(currentDriver, -1);
      },
      overlayClickBehavior: "close",
      popoverClass: "ai-rag-tour-popover",
      prevBtnText: "Back",
      showButtons: ["previous", "next", "close"],
      showProgress: true,
      smoothScroll: true,
      stagePadding: 8,
      stageRadius: 8,
      steps: driverSteps,
    });

    driverRef.current = driverInstance;
    driverInstance.drive(0);
  }, [driverSteps, markSeen, moveToStep, setActiveTab]);

  useEffect(() => {
    isMountedRef.current = true;

    const timeout = window.setTimeout(() => {
      onAutoDisabledChange(isProductTourAutoDisabled(window.localStorage));

      if (shouldAutoStartProductTour(window.localStorage)) {
        void startTour();
      }
    }, AUTO_START_DELAY_MS);

    return () => {
      isMountedRef.current = false;
      window.clearTimeout(timeout);
      driverRef.current?.destroy();
    };
  }, [onAutoDisabledChange, startTour]);

  useEffect(() => {
    if (runId <= 0 || runId === lastRunIdRef.current) {
      return;
    }

    lastRunIdRef.current = runId;

    const timeout = window.setTimeout(() => {
      void startTour();
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [runId, startTour]);

  return null;
}

function waitForTabRender() {
  return new Promise((resolve) => {
    window.setTimeout(resolve, TAB_RENDER_DELAY_MS);
  });
}
