# Pipeline Status

(insert diagram here)

## Current

### Linting and Code Style

All linting is done in the pipeline, run on push via Github Actions workflow.

- **ESLint:** Uses the recommend rules for JavaScript, Typescript, and React. It also enforces the use of JSDocs comments on .js files.
- **Prettier:** It's used by our frontend team to enforce code style. We chose to use Prettier on top of ESLint because configuring style enforcement in ESLint is more complicated.

### Code Quality
- **Human Review:** The main branch of our repo is protected, so all changes to the codebase must be made via pull request. We have a template for the pull requests that include a description and a checklist of steps to take before merging. Pull requests must pass all workflows and be approved by at least one human reviewer.
- **Codacy:** Automated code quality check within the pipeline. Looks for security vulnerabilities within the code.
- **Dependabot:** A built in Github tool that checks our dependencies for security vulnerabilities.

### Testing

All unit testing is automated within the pipeline through Github Actions.

- **Vitest:** Used for frontend unit tests, since the frontend is using Vite as a framework.
- **Jest:** Used for backend unit tests.
- **Coverage Badges:** Both Vitest and Jest will generate coverage reports for the files they're run on. Using a shell script run in the Actions environment, we parse the coverage report and create a coverage badge for both the main README and each pull request.

### Documentation

In addition to manual documentation we also generate automatic documentation in the pipeline.

- **JSDoc:** We run JSDoc using Github Actions on push to main (so after all the other checks have passed and the pull request has been merged). This generates the documentation within the Actions environment. Due to our branch protections on the main branch we can't push the docs to the repo, so we deploy it to Github Pages instead.

### Build
- **Environment Management Template:** We have a .env.example that documents the keys needed for building and deployment.

## In Progress/Planned
### Testing
- We need to extend the coverage of our unit tests. Each user story/task has associated unit tests and those should be pushed along with the code before a PR is made.
- Our backend and frontend are currently separate, but after they are connected (current plan is to set up an API endpoint) we will need to write integration tests for it.
- E2E tests also need to wait until we have the full stack working. The plan is to automate them using Jest-Puppeteer but that may change depending on our needs.

### Build/Deployment
- As we don't know the memory requirements of the backend yet, we're still researching deployment platforms. We will need to set up a pipeline for it in a future sprint.

### Monitoring
- As something that would be nice to have after the web app is successfully deployed, we can set up a tool to monitor the performance and user experience.