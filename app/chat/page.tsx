"use client";

import { useState, useEffect, useCallback } from "react";
import Sidebar from "@/components/sidebar/Sidebar";
import ChatArea from "@/components/chat/ChatArea";
import { TooltipProvider } from "@/components/ui/Tooltip";
import { getActiveProjectId, getProjects, saveActiveProjectId } from "@/lib/store";
import { MOCK_PROJECTS, Project } from "@/lib/mock-data";

export default function ChatPage() {
  const [activeProjectId, setActiveProjectId] = useState<string>(MOCK_PROJECTS[0].id);
  const [projects, setProjects] = useState<Project[]>(MOCK_PROJECTS);

  useEffect(() => {
    setActiveProjectId(getActiveProjectId());
    setProjects(getProjects());
  }, []);

  const handleProjectChange = useCallback((id: string) => {
    setActiveProjectId(id);
    saveActiveProjectId(id);
    // Refresh project list in case sidebar created a new one
    setProjects(getProjects());
  }, []);

  const activeProject = projects.find((p) => p.id === activeProjectId) ?? projects[0] ?? MOCK_PROJECTS[0];

  return (
    <TooltipProvider>
      <div className="flex h-screen w-screen overflow-hidden bg-[#0d1117]">
        <Sidebar
          activeProjectId={activeProjectId}
          onProjectChange={handleProjectChange}
        />
        <main className="flex flex-1 flex-col overflow-hidden min-w-0">
          <ChatArea
            key={activeProjectId}
            projectId={activeProjectId}
            projectName={activeProject.name}
          />
        </main>
      </div>
    </TooltipProvider>
  );
}
