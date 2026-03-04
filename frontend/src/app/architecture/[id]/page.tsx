"use client";

import { useParams } from "next/navigation";
import ArchitectureViewer from "@/components/archai/ArchitectureViewer";

export default function ArchitectureViewerPage() {
  const params = useParams();
  const projectId = params.id as string;
  return <ArchitectureViewer projectId={projectId} />;
}
