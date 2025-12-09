# Homepage Mockup Design Doc

## 1. Process

### 1.1 Overview

This design doc defines the workflow and decisions behind the **Homepage Mockup** implementation for the Repository Architecture Diagramming. The homepage serves as the entry point for users to input repositories, view sample diagrams, and access visualization history.

The mockup is generated using **Codex (LLM)** to bootstrap the initial layout, guided by the **Figma wireframe** for structure and hierarchy. It ensures that all developers share a consistent design baseline that minimizes merge conflicts. Implementation Details: <https://github.com/CSE210-fa25-team09/Repository-Architecture-Diagramming/tree/prototype/homepage>

### 1.2 Workflow

1. **Wireframe Alignment**
   - Structure follows the Figma wireframe strictly for layout zones and spacing.
   - Core regions: Navbar, Repo Input/Search, Example Repositories, History, and Footer.

2. **LLM Code Generation**
   - Codex generates the initial React component hierarchy and Tailwind/Shadcn structure.
   - Generated files include placeholders for history cards and search input.

3. **Team Review & Design Unification**
   - Developers align on a **GitHub-like color theme**, layout spacing, and reusable component patterns.
   - These patterns are centralized into `App.tsx` and `index.css`, forming the unified design foundation for the homepage.

4. **Iteration Cycle**
   - Team adds new interactions post-review:
     - Light/Dark toggle in Navbar.
     - Expandable history cards.
     - Auto-hide Example/History sections when search results are shown.

## 2. Decision

### 2.1 Navbar

- Includes project title on the left and **theme toggle button** on the right.

### 2.3 Search and Repo Input

- Centralized search input field (URL or ZIP upload).
- When the user searches:
  - History and Example sections collapse .
  - Search results occupy the center viewport.

### 2.4 History Card Interaction

- Cards are vertically expandable.

## 3. Alternatives Considered

- **History presentation**: prototype a carousel treatment for the history section so users can scan more past diagrams without scrolling.
  - **Pros**: surfaces more artifacts within the same vertical space; draws attention to history without forcing users to leave the hero area; interaction can feel modern when animated smoothly.
  - **Cons**: carousel controls add complexity for keyboard/mobile accessibility; users may overlook older items because only a subset is visible at any moment; engineering effort increases if cards need lazy loading.
- **Search visibility**: explore keeping the Example and History sections visible even after search results load, relying on emphasis states instead of hiding content.
  - **Pros**: avoids jarring layout shifts when results appear; keeps contextual examples available for cross-checking styling or scope; simplifies state management because sections do not toggle on/off.
  - **Cons**: viewport can feel crowded, especially on smaller screens; results compete for visual hierarchy with static sections; may require more nuanced focus handling for screen readers.
- **Navbar controls**: evaluate whether the navbar should still include a dedicated theme toggle button or if theme selection can move elsewhere.
  - **Pros**: removing the toggle declutters the navbar and reserves space for future nav items; centralizing theme control can align with broader app preferences.
  - **Cons**: users lose immediate access to theme switching, which is valuable during demos; burying the control increases clicks and hurts discoverability

## 4. Style Consolidation

### 4.1 Theme + tokens

- All colors are CSS variables declared in `src/index.css`. Use them through Tailwind arbitrary values (`bg-[var(--panel-bg)]`, `text-[color:var(--muted-text)]`, etc.).
- Core palette (light / dark):

| Token                         | Light     | Dark      | Usage                  |
| ----------------------------- | --------- | --------- | ---------------------- |
| `--page-bg`                   | `#f6f8fa` | `#0d1117` | App background         |
| `--page-foreground`           | `#1f2328` | `#e6edf3` | Default text           |
| `--panel-bg`                  | `#ffffff` | `#161b22` | Cards, hero            |
| `--panel-border`              | `#d0d7de` | `#30363d` | Panel outlines         |
| `--muted-text`                | `#57606a` | `#8b949e` | Secondary copy         |
| `--icon-muted`                | `#6e7781` | `#8b949e` | Icons                  |
| `--input-bg`                  | `#f6f8fa` | `#0d1117` | Text fields            |
| `--input-border`              | `#d0d7de` | `#30363d` | Text field border      |
| `--input-placeholder`         | `#8c959f` | `#8b949e` | Placeholders           |
| `--btn-primary-bg`            | `#1f883d` | `#197935` | Primary Button default |
| `--btn-primary-hover`         | `#1c8139` | `#1c8139` | Primary Button hover   |
| `--btn-primary-active`        | `#197935` | `#1f883d` | Primary Button active  |
| `--primary-action-foreground` | `#ffffff` | `#0d1117` | Primary Button text    |
| `--secondary-action-bg`       | `#24292f` | `#f6f8fa` | Secondary button       |
| `--card-bg`                   | `#ffffff` | `#161b22` | Repo tiles             |
| `--card-border`               | `#d0d7de` | `#30363d` | Tile border            |
| `--card-hover`                | `#f0f3f6` | `#1f242d` | Tile hover surface     |

### 4.2 Typography & line height

- Font: Tailwind system sans.
- Titles: `text-2xl font-semibold`, `leading-tight`.
- Section labels: `text-base font-medium text-[var(--muted-text)]`.
- Card titles: `text-base font-semibold`.
- Supporting body text: `text-sm text-[var(--muted-text)]`.
- Buttons: `text-base` for primaries, `text-sm` for secondary/utility actions.

### 4.3 Border radii (Tailwind)

- Panels/cards/logo badge: `rounded-xl`.
- Repo cards: `rounded-2xl`.
- Primary buttons: `rounded-full`.
- Inputs (rectangular): `rounded-md`; search field uses `rounded-full`.

### 4.4 Component Map (shadcn equivalents)

| UI element                                                                 | Shadcn component(s)                                   |
| -------------------------------------------------------------------------- | ----------------------------------------------------- |
| Logo badge                                                                 | `Button` (anchor styled as button) or plain div       |
| Theme toggle                                                               | `Button` (`variant="outline"`, `size="icon"`)         |
| Primary Button (“Generate Diagram”)                                        | `Button` default variant                              |
| Secondary/outline buttons (“Upload Zip”, theme toggle, “Home” when needed) | `Button` (`variant="outline"`)                        |
| Text inputs (URL + Search)                                                 | `Input`                                               |
| Repo cards                                                                 | `Card`, `CardContent`, `CardTitle`, `CardDescription` |

## 5. References

- Internal Design Doc: <https://github.com/CSE210-fa25-team09/Repository-Architecture-Diagramming/tree/main/specs/design>
- Figma Design Doc: <https://www.figma.com/board/zMKsfe6XcEK68TerPIorgZ/Design-Doc?node-id=0-1&p=f&t=xqeRV5aOvZVMD0qk-0>
- Github: <https://brand.github.com/foundations/color>
