// src/lib/repoData.ts

export type Repo = {
  id: string
  name: string
  description: string
}

export const SAMPLE_REPOS: Repo[] = [
  {
    id: "our-repo",
    name: "Repository Architecture Diagramming",
    description: "Our own CSE210 team repo for the repository architecture diagramming tool.",
  },
  {
    id: "fastapi",
    name: "FastAPI",
    description: "High-performance Python web framework for building APIs.",
  },
  {
    id: "call-center-ai",
    name: "Microsoft Call Center AI",
    description: "Reference implementation for an AI-powered call center system.",
  },
  {
    id: "verl",
    name: "VERL",
    description: "Volcengine’s open-source framework for vision-language and RL models.",
  },
]