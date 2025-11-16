// src/lib/repoData.ts

export type Repo = {
  id: string;
  name: string;
  description: string;
};

// This is the ONLY source of truth for sample repos.
// Modify this list anytime — everything else (SampleSection, History, clicking logic)
// will update automatically.
export const SAMPLE_REPOS: Repo[] = [
  {
    id: "repo-1",
    name: "repo-1",
    description: "Sample repository-1",
  },
  {
    id: "repo-2",
    name: "repo-2",
    description: "Sample repository-2",
  },
  {
    id: "repo-3",
    name: "repo-3",
    description: "Sample repository-3",
  },
  {
    id: "repo-4",
    name: "repo-4",
    description: "Sample repository-4",
  },
  {
    id: "repo-5",
    name: "repo-5",
    description: "Sample repository-5",
  },
];