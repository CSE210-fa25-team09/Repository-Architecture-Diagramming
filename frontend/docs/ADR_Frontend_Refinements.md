# ADR: Sprint 2 & 3 Frontend Refinements

**Title:** Decision Refinements
* **Date:** 2025-12-09
* **Status:** Accepted

## 1. Context 
During the process of our Sprints 2 and 3, we encountered scoping challenges and ambiguous requirements regarding the Homepage and the Diagram Page.

1.  **Homepage (Zip Upload):** The implementation of the "Zip" upload feature proved too time-consuming than anticipated within the current timeline.
2.  **Homepage (Card Content):** The initial ADR and design documents left the specific content of the Repository Input Cards undefined. We needed to finalize exactly what data appears on these cards to proceed with frontend implementation.
3.  **Diagram Page (Branch Selection):** A technical challenge arose regarding repository branching conventions. Some repositories use `master` as the primary branch, while others use `main`. Hardcoding an initial load state for either one resulted in errors for incompatible repositories.

## 2. Decision 
* **Time Constraints:** The need to deliver a functional MVP within the sprint timeline necessitated scope reduction.
* **Specification Finalization:** Finalize gaps left by previous design phases regarding UI data.
* **Branch Naming Inconsistency:** The need to handle the `main` vs `master` naming discrepancy across different GitHub repositories without user intervention.

We have decided to refine the scope for both pages:

### 1. Homepage Refinements
* **Remove "Zip" Upload:** We are removing the "zip" file functionality from the current release. 
    * ** This decision was driven by **time constraints**. Removing this scope allows the team to focus on the core features for the MVP.
* **Card Content Finalization:** We have finalized the previously undetermined details regarding the card UI. The Repository Input Card will display:
    1.  **Repository Name**
    2.  **Repository Description**

### 2. Diagram Page Refinements
* **Graph Visualization Options:** The page will support **3 different options for graphs**.
* **Default Branch as First Panel:** Upon navigation, the application will automatically identify and load the repository's **default branch**.
    * ** This approach resolves the `main` vs `master` conflict. Instead of hardcoding, we rely on the repository's configured default branch to ensure the first panel always loads a valid graph regardless of the specific naming convention used by the repo owner.

## Consequences

### Positive Outcomes
* **Schedule Adherence:** Dropping the Zip feature ensures we can meet our Sprint delivery deadlines.
* **Clarity:** Frontend developers now have a defined specification for the card layout, removing some minor ambiguity of the initial design.

### Negative Outcomes
* **Feature Cut:** Users who rely solely on local Zip files will not be supported in this release.
* **Dependency:** We must ensure we correctly fetch the `default_branch` from the repository metadata before rendering the diagram panel.


