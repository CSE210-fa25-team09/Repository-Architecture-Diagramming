import type { BranchLibrary } from "@/pages/Diagram"

export const REPOSITORY_NAME = "inventory-diagramming"
export const WORKSPACE_SUMMARY = "Track branch-specific repository flows."
export const BRANCH_LIST = ["main", "hotfix/dynamodb-timeouts"]

export const BRANCH_LIBRARY: BranchLibrary = {
  main: {
    id: "main",
    label: "main",
    lastGenerated: "45 seconds ago",
    diagram: `
      flowchart TD
        Start((Start)) --> Fetch[Fetch inventory snapshot]
        Fetch --> Decision{Stock available?}
        Decision -- Yes --> Reserve[Reserve items]
        Reserve --> Publish[Emit INVENTORY_RESERVED]
        Publish --> Done((Done))
        Decision -- No --> Notify[Notify Slack #ops-inventory]
        Notify --> Escalate[Escalate to SRE rota]
        Escalate --> Done
    `,
    fileTree: `inventory-service
|-- i18n/
|   |-- messages.properties
|   |-- messages_fr.properties
|   |-- messages_pt-BR.properties
|-- services/
|   |-- catalog/
|   |   |-- hydrate.ts
|   |   |-- search.ts
|   |-- fulfillment/
|   |   |-- reserveStock.ts
|   |   |-- publishEvents.ts
|-- utils/
|   |-- passwordCodec.ts
|   |-- retry.ts
|-- main.ts`,
  },
  "hotfix/dynamodb-timeouts": {
    id: "hotfix/dynamodb-timeouts",
    label: "hotfix/dynamodb-timeouts",
    lastGenerated: "12 minutes ago",
    diagram: `
      graph LR
    node5["App.tsx"] --> node6["Header.tsx"]
    node5["App.tsx"] --> node7["separator.tsx"]
    node5["App.tsx"] --> node8["utils.ts"]
    node5["App.tsx"] --> node9["Home.tsx"]
    node5["App.tsx"] --> node10["NotFound.tsx"]
    node18["App.test.tsx"] --> node5["App.tsx"]

    %% Styling
    classDef codeStyle fill:#4A90E2,stroke:#2E5C8A,stroke-width:2px,color:#fff
    class node0,node1,node2,node3,node4,node5,node6,node11,node12,node13,node14,node15,node16,node7,node8,node17,node18,node19,node20 codeStyle
    classDef internalStyle fill:#50C878,stroke:#2E7D4E,stroke-width:2px,color:#fff
    class node6,node7,node8,node9,node10,node5 internalStyle
    `,
    fileTree: `inventory-service
|-- services/
|   |-- throttler.ts
|   |-- timeoutGuard.ts
|-- infra/
|   |-- circuitBreaker.ts
|-- alerts/
|   |-- pagerduty.ts
|-- utils/
|   |-- memoize.ts
|   |-- observability.ts`,
  },
}
