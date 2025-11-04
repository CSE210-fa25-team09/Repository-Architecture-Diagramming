### Process Definition Docs \- 11/3/2025

Agenda: review designs, go over repo, go over sprint schedule, docs, stack, assignments, meetings

Meetings and Sprint Schedule  
All meetings held on Slack Huddle, with the exception of hands-on in-person meetings, are disclosed beforehand.

- Standups after lecture (in-person) on T/TH for 10-30 minutes  
  - What each person/team is working on, what they will do, and blockers  
  - Announcements from leads  
- Sprint planning \+ retrospective on Mondays, 2-3 PM (subject to change)  
- Subgroup meetings up to the subgroup lead  
- Huddles up to members

Processes and Docs

- Version control via GitHub  
- CI/CD via GitHub Actions  
- Project Management via GitHub Projects

- Definition of done: If all the tasks of the issue are merged, tested, and/or fully solved  
- Main branch protected  
- Tags via team notify all in the team  
- Issue creation:  
  - Follow template  
  - Tag team involved, and the person responsible  
  - Assign labels, type, and project board  
    - Assign T-shirt size (how much work) and priority  
      - P0 is reserved for emergency/immediate changes  
    - Add the expected completion date as extra context  
  - Attach to the parent issue (epic) if it is a subissue  
  - Epics will be set to sprint long and handled by the subgroup lead  
- Project board:  
  - Backlog: All groomed tickets  
  - In progress: Starting to work on it  
  - In review: MR  
  - QA: post-review changes needed/occuring  
  - Done: satisfies the definition of done, only moved here by the subgroup leads  
- MR process:  
  - Follow template  
  - If necessary, include screenshots, bullets of changes, and future steps  
  - Tag teams and attach to the issue

- Docs:  
  - Done via Google Docs \-\> shared on Slack channel \-\> uploaded to repo as .md  
  - Design: include all design docs (and design changes) in this directory  
  - ADRs:  
    - Context: what decision needs to be made and why  
    - Options considered: what alternatives were evaluated  
    - Decision: what was chosen and why  
    - Consequences: trade-offs or implications

Stack and Architecture

- Frontend: Vanilla HTML/CSS/JS \-\> React (potentially)  
- Backend: Node and Express  
- Database: JSON, Local Storage, potentially  
  - Stored: Project diagram itself  
- Deployment: Cloud? (AWS, GCP), potentially may need to pivot if running local LLM  
  - Will not need if doing API calls to LLM

Assignments  
Product/TPM:

- Hayden

Frontend:

- Peter (lead)  
- Andrew  
- Krishna

Backend:

- Manav (lead)  
- Jason  
- Prince  
- Xiongyi (AI research)  
- Guanqi

Deployment:

- Elaine (lead)  
- Priya

