# Saans Architecture

## System Overview

```mermaid
graph TB
    subgraph "Frontend"
        Browser["Next.js PWA<br/>MapLibre GL JS"]
    end

    subgraph "AWS Cloud"
        subgraph "Edge"
            CF["CloudFront CDN"]
            Amplify["Amplify Hosting"]
        end

        subgraph "Auth"
            Cognito["Cognito User Pool<br/>custom:role attribute"]
        end

        subgraph "API Layer"
            APIGW["API Gateway<br/>REST, throttling, CORS"]
        end

        subgraph "Compute"
            FarmerPlan["Lambda: farmer-plan<br/>→ Planner Agent"]
            FarmerBook["Lambda: farmer-book"]
            Today["Lambda: today"]
            Ask["Lambda: ask<br/>→ Ask Agent"]
            MapLayers["Lambda: map-layers"]
            Reports["Lambda: reports<br/>→ Triage Agent"]
            Profile["Lambda: profile"]
        end

        subgraph "AI/ML"
            Bedrock["Amazon Bedrock<br/>Claude 3 Sonnet"]
            Strands["Strands Agents SDK"]
        end

        subgraph "Scheduled"
            EB["EventBridge Schedules"]
            IngestFIRMS["Lambda: ingest-firms"]
            IngestWeather["Lambda: ingest-weather"]
            IngestAQI["Lambda: ingest-aqi"]
            Monitor["Lambda: monitor-agent"]
        end

        subgraph "Data"
            DDB["DynamoDB<br/>Users, Reports, MachineSlots,<br/>StrawOutlets, Subscriptions,<br/>DataCache, AgentRuns"]
            S3Photos["S3: Report Photos"]
            S3Cache["S3: Cached Datasets"]
        end

        subgraph "Notifications"
            SNS["SNS Topic<br/>Email/Push Alerts"]
        end

        subgraph "Observability"
            CW["CloudWatch<br/>Logs, Metrics, Alarms"]
            Budget["AWS Budgets"]
        end
    end

    Browser --> CF --> Amplify
    Browser --> APIGW
    APIGW --> Cognito
    APIGW --> FarmerPlan & FarmerBook & Today & Ask & MapLayers & Reports & Profile
    FarmerPlan --> Strands --> Bedrock
    Ask --> Strands
    Reports --> Strands
    EB --> IngestFIRMS & IngestWeather & IngestAQI & Monitor
    FarmerPlan & FarmerBook & Today & MapLayers & Reports & Profile --> DDB
    Reports --> S3Photos
    IngestFIRMS & IngestWeather & IngestAQI --> DDB & S3Cache
    Monitor --> SNS
    Monitor --> DDB

    style Bedrock fill:#ff9900,color:#000
    style Strands fill:#232f3e,color:#fff
    style Cognito fill:#dd344c,color:#fff
    style APIGW fill:#a166ff,color:#fff
```

## Data Flow

```mermaid
sequenceDiagram
    participant F as Farmer
    participant Web as Next.js
    participant API as API Gateway
    participant Agent as Planner Agent
    participant Tools as Agent Tools
    participant DB as DynamoDB

    F->>Web: Open "My Field"
    Web->>API: POST /v1/farmer/plan
    API->>Agent: Invoke planner
    Agent->>Tools: get_forecast()
    Agent->>Tools: get_wind()
    Agent->>Tools: get_fire_hotspots()
    Agent->>Tools: get_sowing_window()
    Agent->>Agent: Score 7 days
    Agent->>Tools: find_machine_slots()
    alt Machine available
        Agent->>Web: Best day + machine option
    else No machine
        Agent->>Tools: find_straw_outlets()
        Agent->>Web: Best day + straw outlet fallback
    end
    Agent->>DB: Log agent run
    Web->>F: Display plan card with trace
```

## Key Design Decisions

1. **Strands Agents SDK** for agent orchestration (satisfies AWS open-source requirement)
2. **Deterministic scoring** — the agent explains scores but doesn't override them
3. **Sample data badges** — all non-live data clearly marked in the UI
4. **Role-based auth** via Cognito `custom:role` — simple farmer/citizen separation
5. **No medical advice** — only standard AQI-category guidance
6. **Untrusted input handling** — report text never influences agent behavior
