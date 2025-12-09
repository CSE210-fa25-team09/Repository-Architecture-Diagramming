# Diagram Page Mockup Design Doc

## 1. Process

### 1.1 Overview

This document captures the design and implementation reasoning for the **Diagram Page Mockup**. The page visualizes repository structure and Mermaid-generated flows per branch, mirroring the provided wireframe. The experience was built with Shadcn components (dialogs, resizable panels, dropdowns) plus a custom Mermaid wrapper.

Implementation details live in this branch: <https://github.com/CSE210-fa25-team09/Repository-Architecture-Diagramming/tree/prototype/diagram-page>

### 1.2 Workflow

1. **Wireframe Decomposition**
   - Workspace hero shows repo badge, name, and description.
   - Reusable “diagram card” renders file tree + Mermaid flow side by side.
   - A floating control lets users add/remove branch diagrams.

2. **Backend Expectations**
   - **Initial load** (user enters GitHub link or ZIP on home):
     - Repo name (GitHub repo title or folder name).
     - Repo “about” text (GitHub description or empty).
     - List of branches.
     - Diagram + file tree data for the main branch.
     - `lastGenerated` timestamp for the main branch.
   - **Branch switch**:
     - Diagram + file tree for the selected branch.
     - `lastGenerated` timestamp for that branch.
   - The UI consumes these payloads and updates the diagram cards without page reloads.

3. **LLM Bootstrap**
   - Codex generated the first pass of the layout: card scaffolding, dropdowns, buttons, and Mermaid area. Colors hook into existing CSS variables from `index.css`.

4. **Iteration Cycle**
   - Added exports (workspace-level and single-card) using `html-to-image`.
   - Introduced dialogs for enlarged diagrams and a draggable splitter via `react-resizable-panels`.
   - Implemented a GitHub-like file tree toggle which collapses the left panel into a slim “Show file tree” button aligned with the SWE Diagram heading.

## 2. Decision

### 2.1 Workspace Header

- Shows repo badge, name, and summary so users know which project they’re inspecting.
- Export button captures the entire workspace container in PNG format to match the wireframe’s “Export as Image” affordance.

### 2.2 Branch Cards

- Each card contains:
  - Branch metadata (label + last generated time).
  - A dropdown to swap branches within the card.
  - Optional remove button (hidden for the last card).
- Cards rely on mock data but expect real API values per the workflow section.

### 2.3 File Structure Panel

- Displays the server-provided tree inside a scroll area.
- Collapsible via a left-chevron button; when hidden, a “Show file tree” control appears inline with the SWE Diagram title to mimic GitHub’s sidebar reveal UX.
- Resizable panel lets users allocate more space to either column.

### 2.4 Diagram Panel

- Renders Mermaid SVG using a memoized renderer with custom theme overrides for clarity.
- Inline “Export as Image” downloads only that branch’s flow.
  - Clicking the diagram opens a dialog preview sized with responsive max width/height caps so the graphic remains the focal point regardless of viewport.

## 3. Alternatives Considered

- **No collapse button for file tree**
  - _Pros_: simpler control surface, fewer interaction states.
  - _Cons_: contradicts wireframe notes about optional tree visibility; makes it harder to emphasize the diagram on smaller screens; diverges from the GitHub mental model.

## 4. References

- Internal Design Doc: <https://github.com/CSE210-fa25-team09/Repository-Architecture-Diagramming/tree/main/specs/design>
- Figma Design Doc: <https://www.figma.com/board/zMKsfe6XcEK68TerPIorgZ/Design-Doc?node-id=0-1&p=f&t=xqeRV5aOvZVMD0qk-0>
