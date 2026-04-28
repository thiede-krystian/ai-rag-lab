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
    target: "demo-flow-panel",
    tab: "documents",
    title: "Recommended demo flow",
    description:
      "Use this checklist to move through the interview-ready story: import documents, search, ask RAG, run evals, and score a CV-job fit.",
    side: "bottom",
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
    target: "add-text-button",
    tab: "documents",
    title: "Add text documents",
    description:
      "Paste a job offer, CV, or knowledge note and index it as chunks with OpenRouter embeddings.",
    side: "bottom",
  },
  {
    target: "import-pdf-button",
    tab: "documents",
    title: "Import searchable PDFs",
    description:
      "Upload a searchable PDF, extract text, chunk it, embed it, and upsert the chunks into Qdrant.",
    side: "bottom",
  },
  {
    target: "search-form",
    tab: "search",
    title: "Semantic Search",
    description:
      "Search embeds your query and retrieves the most similar Qdrant chunks with scores.",
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
    target: "chat-form",
    tab: "chat",
    title: "RAG Chat",
    description:
      "Ask a question, choose retrieval depth, and generate an answer grounded in retrieved chunks.",
    side: "bottom",
  },
  {
    target: "rag-answer",
    tab: "chat",
    title: "Grounded answer",
    description:
      "The answer and citations are the main output; raw retrieved JSON is available in advanced details.",
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
    target: "evals-form",
    tab: "evals",
    title: "Retrieval quality check",
    description:
      "Choose an expected document and queries, then inspect Recall@K, MRR, pass rate, and latency.",
    side: "bottom",
  },
  {
    target: "tab-cv",
    tab: "cv",
    title: "CV Maker",
    description:
      "CV Maker extracts text from a searchable CV PDF, turns it into an editable draft, and exports a new CV.",
    side: "bottom",
    align: "end",
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
    target: "cv-export",
    tab: "cv",
    title: "Export CV",
    description:
      "Download Markdown in the browser or generate a clean A4 PDF from the structured CV draft.",
    side: "bottom",
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
