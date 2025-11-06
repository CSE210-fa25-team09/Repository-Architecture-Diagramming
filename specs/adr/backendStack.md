# **Architecture Decision Record (ADR)**

ADR \#: 003  
Title: Backend Stack: Node.js \+ Express \+ JSON file storage  
Date: 2025-11-06  
Status: Proposed

---

## **1\. Context**

We require a backend service that can:

* Integrate with the GitHub REST API to fetch repository structure, commits, and metadata.  
* Preprocess, assemble, and transmit repository data to downstream components (such as an LLM or direct diagram generator).  
* Serve generated/saved architecture diagrams and curated samples to the frontend via REST endpoints.  
* Be lightweight, quick to iterate, and easy for web-first contributors to maintain.  
* Provide endpoints for both user-driven requests (analyze repo, history/cache management) and statically managed samples.

### **Constraints/requirements:**

* Maximize developer familiarity and onboarding speed.  
* Support rapid prototyping, minimal server ops overhead, and easy local development.  
* Should not require a full database; only a few curated samples are stored, while user history is handled in-browser.  
* Cleanly decouple logic for integrating LLM and other backend components (e.g., file system, future databases).

Current state  
No backend implementation has been finalized; API contracts are proposed. 

---

## **2\. Decision**

We will use Node.js \+ Express for the backend, with JSON file storage for curated samples.

* *Express*: De-facto web API server for Node.js, minimal and flexible, familiar to most contributors.  
* *Node.js*: Async event loop, fits our IO-bound needs, and matches the frontend’s language.  
* *JSON file storage for samples*: For 5–10 curated public example diagrams, easily version-controlled and updated.  
* *Fetch GitHub data via npm libraries* (@octokit/rest, axios).  
* *Future expandability*: Modular code to allow addition of LLM endpoints and/or migration to a database if sample/catalog or analytics requirements grow.

How this addresses our needs:

* Developer velocity – almost all team members can contribute immediately without ramp-up.  
* Tooling – rich npm ecosystem for HTTP, GitHub, and file management.  
* Ops – portable to any cloud VM (Render, Railway, etc.), easy to deploy, standard CI/CD (GitHub Actions).

---

## **3\. Alternatives Considered**

Python (FastAPI)

* Pros: Very fast, async, type-safe, good OpenAPI docs.  
* Cons: Introduces Python to a team already using JS/TS for frontend, increasing context switching, and less direct ecosystem fit for simple IO/web workloads. Two-language codebase:

Django/Flask

* Pros: Powerful for fully-featured web apps.  
* Cons: Overkill for stateless APIs, more boilerplate.


Database (MongoDB, SQL)

* Pros: Scales easily for high data volumes, complex queries.  
* Cons: Overkill for ≤10 curated samples, adds ops complexity.

Vanilla JS (No Framework or Minimal HTTP Module)

* Pros: Minimal dependencies, ultimate control, lowest possible server overhead.  
* Cons: Significant effort to correctly handle routing, middleware, error handling, and response formatting; high maintenance burden as complexity grows; lower team velocity.  
* *Rationale for not choosing*: Express solves all basic routing/REST concerns for you, provides middleware out of the box, and is universally recognized in the JS ecosystem \- starting from scratch adds risk and technical debt for very little gain.

---

## **4\. Consequences**

## **Positive Outcomes**

* Team productivity and velocity: Lowest barrier for new contributors, fastest iteration.  
* Rapid prototyping and deployment: JS/Express is deployable everywhere, robust CI/CD available.  
* Easily manage samples via JSON and Git, matching Ops simplicity and team practices.  
* LLM, other APIs, or migration to a full DB are easy if requirements expand.

## **Negative Outcomes / Risks**

* Not strongly typed unless we add TypeScript \- potential for more runtime errors.  
* Express is slightly less “opinionated”—it relies on best practices for project structure and security.  
* File-based samples are only suitable for small-scale and admin-updated sets.

## **Mitigations**

* Add linting, TypeScript, or schema validation (e.g., zod/joi) for request/response validation.  
* Plan for easy DB integration/migration if needed.  
* Add ADRs and code comments to document all major decisions.

---

## **5\. Implementation Notes**

Packages

* express, cors, dotenv  
* @octokit/rest (GitHub API)  
* fs/promises (Node file I/O)  
* body-parser  
* \[Optional\] zod/joi for JSON/schema validation  
* \[Optional\] TypeScript later for type safety

Project Layout

text

`/backend`  
  `├─ src/`  
  `│  ├─ routes/        # REST endpoint handlers`  
  `│  ├─ services/      # GitHub, LLM, diagram logic`  
  `│  ├─ utils/`  
  `├─ samples.json      # Curated samples`  
  `├─ app.js / index.js`  
  `└─ package.json`

Rollout plan

* Scaffold Express app and GitHub API integration.  
* Implement /api/diagram, /api/samples, etc.  
* Add sample endpoints; connect with frontend contract.  
* LLM/diagram integration via modular service.  
* CI/CD: GitHub Actions on push for lint/test/deploy.

Performance/testing notes

* Lightweight servers expected (main work is IO-bound).  
* Integrate unit and endpoint tests.  
* Monitor and document file I/O; switch to DB if needed.

---

## **6\. References**

* Express: [https://expressjs.com/](https://expressjs.com/)  
* Node.js: [https://nodejs.org/](https://nodejs.org/)  
* Octokit: [https://octokit.github.io/rest.js/](https://octokit.github.io/rest.js/)  
* Writing maintainable Express APIs:  [https://dev.to/emmaccen/structuring-express-apps-for-scalability-and-maintainability-3eke](https://dev.to/emmaccen/structuring-express-apps-for-scalability-and-maintainability-3eke)  
* ADR style guidance:  
  * [AWS ADR best practices](https://aws.amazon.com/blogs/architecture/master-architecture-decision-records-adrs-best-practices-for-effective-decision-making/)  
  * [Red Hat ADR overview](https://www.redhat.com/en/blog/architecture-decision-records)

