import { RagLabShell } from "@/components/rag-lab-shell";
import { qdrantConfig } from "@/lib/config";

export default function Home() {
  return <RagLabShell qdrantTarget={qdrantConfig.target} />;
}
