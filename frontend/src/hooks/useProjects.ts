"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/utils/supabase";

export interface Project {
  id: string;
  project_id: string;
  name: string;
  keywords: string[];
  architecture: Record<string, unknown>;
  idea: string;
  created_at: string;
  updated_at: string;
}

export function useProjects(userId: string | null | undefined) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProjects = useCallback(async () => {
    if (!userId) { setProjects([]); return; }
    setLoading(true);
    setError(null);
    try {
      const { data, error: sbErr } = await supabase
        .from("projects")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (sbErr) throw sbErr;
      setProjects((data as Project[]) || []);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to load projects";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // Real-time subscription
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`projects:user:${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "projects", filter: `user_id=eq.${userId}` },
        () => fetchProjects()
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId, fetchProjects]);

  return { projects, loading, error, refetch: fetchProjects };
}
