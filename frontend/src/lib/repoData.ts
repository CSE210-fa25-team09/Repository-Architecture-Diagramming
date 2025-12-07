// src/lib/repoData.ts

export type Repo = {
  id: string
  name: string
  description: string
  url: string
}

export const SAMPLE_REPOS: Repo[] = [
  {
    id: "our-repo",
    name: "Repository Architecture Diagramming",
    description:
      "Our own CSE210 team repo for the repository architecture diagramming tool.",
    url: "https://github.com/CSE210-fa25-team09/Repository-Architecture-Diagramming",
  },
  {
    id: "fastapi",
    name: "FastAPI",
    description: "High-performance Python web framework for building APIs.",
    url: "https://github.com/tiangolo/fastapi",
  },
  {
    id: "call-center-ai",
    name: "Microsoft Call Center AI",
    description: "Reference implementation for an AI-powered call center system.",
    url: "https://github.com/microsoft/call-center-ai",
  },
  {
    id: "verl",
    name: "VERL",
    description: "Volcengine’s open-source framework for vision-language and RL models.",
    url: "https://github.com/volcengine/verl",
  },
]
