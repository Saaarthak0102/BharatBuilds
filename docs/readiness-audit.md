# Saans / BharatBuilds: Read-Only Readiness Audit

**Audit Date:** 2026-10-11  
**Scope:** Architecture, SAM Template, Python Services, Frontend Contracts, Dependencies, IAM, Data & Seeding  
**Execution Context:** Windows Host (No Docker / CloudShell), `sam build` target Python 3.12 (x86_64), Bedrock via `boto3` Converse, Target Region `ap-south-1`.

---

## A. BUILD READINESS

### 1. `strands` Dependency & Usage Analysis

Every occurrence of `strands` across the repository was audited. Strands agents SDK dependencies (`pywin32`) break Windows `sam build` because `pywin32` cannot be built or cross-compiled for Linux without Docker.

| File | Lines | Usage Type | Current Operation | Rewrite Needed & Effort |
| :--- | :--- | :--- | :--- | :--- |
| [requirements.txt](file:///d:/BharatBuilds/services/requirements.txt#L4) | L4 | Dependency specification | `strands-agents` package entry | Remove line 4. (1 min) |
| [services/agents/planner/agent.py](file:///d:/BharatBuilds/services/agents/planner/agent.py#L20-L79) | L20-21, L59-79 | Agent runner & BedrockModel import | Imports `Agent`, `BedrockModel`. Instantiates `Agent(model=model, tools=[...])` and calls `agent(prompt)` to invoke tools into contextvars. | Replace strands `Agent` execution with direct sequential tool calls or boto3 Converse toolConfig loop. Note: The scoring and re-planning logic (L106-160) is already 100% deterministic Python, and reasoning explanation (L171) already uses `structured_complete` via `boto3.converse`. Rewrite to call tools directly. (15 min) |
| [services/agents/planner/tools.py](file:///d:/BharatBuilds/services/agents/planner/tools.py#L12) | L12, L143, L202, L257, L294, L323, L357 | `@tool` decorator | `from strands.tools import tool`. Decorates tool functions (`get_forecast`, `get_wind`, `get_fire_hotspots`, `get_sowing_window`, `find_machine_slots`, `find_straw_outlets`). | Replace `@tool` with a no-op decorator `def tool(fn): return fn` or remove decorator completely. (5 min) |
| [services/agents/triage/agent.py](file:///d:/BharatBuilds/services/agents/triage/agent.py#L16-L55) | L16, L42-55 | Agent runner stub | Imports `Agent`. Instantiates `self.agent = Agent(...)` in `__init__`, but `self.agent` is **NEVER** called in `triage_report()` (triage executes via `structured_complete(TriageAssessment)` at L162). | Remove `from strands import Agent` and the unused `self.agent` initialization block. (5 min) |
| [services/agents/triage/tools.py](file:///d:/BharatBuilds/services/agents/triage/tools.py#L4) | L4, L25, L77, L102, L130 | `@tool` decorator | `from strands import tool`. Decorates functions (`find_nearby_reports`, `merge_into`, `update_status`, `write_report`). | Remove `from strands import tool` and remove `@tool` decorators. (5 min) |
| [services/agents/monitor/agent.py](file:///d:/BharatBuilds/services/agents/monitor/agent.py#L19) | L19 | Unused Import | `from strands import Agent`. Never instantiated or invoked (uses `structured_complete(AlertContent)` at L109). | Remove unused import line 19. (1 min) |
| [services/agents/common/model.py](file:///d:/BharatBuilds/services/agents/common/model.py#L13-L20) | L13-20 | BedrockModel provider | Tries `from strands.models import BedrockModel`. Falls back to `boto3.client("bedrock-runtime")`. | Remove `try/except` for strands; return `boto3.client("bedrock-runtime")` directly. (5 min) |
| [services/agents/ask/agent.py](file:///d:/BharatBuilds/services/agents/ask/agent.py#L2) | L2, L35 | Comments / Stubs | Comment mentions Strands Agents SDK. Not imported. | Clean up docstring/comments. (1 min) |
| [services/api/handlers/ask.py](file:///d:/BharatBuilds/services/api/handlers/ask.py#L60) | L60 | Comment | `# TODO: Call the Strands Ask agent...` | Keep or clean comment. (0 min) |
| [tests/agents/test_scenarios.py](file:///d:/BharatBuilds/tests/agents/test_scenarios.py#L76-L132) | L76, L132 | Test Monkeypatch | Patches `strands.Agent.__call__`. | Update test mocks to patch the new direct runner. (10 min) |
| [tests/agents/test_tools.py](file:///d:/BharatBuilds/tests/agents/test_tools.py#L195-L196) | L195-196 | Test comments | Comments reference strands kwargs binding. | None. |
| [tests/api/test_handlers.py](file:///d:/BharatBuilds/tests/api/test_handlers.py#L155-L157) | L155-157 | Skipped test | `pytest.skip("Live Strands planner...")` | None. |

---

### 2. Linux Dependency Dry-Run (manylinux2014_x86_64, Python 3.12)

Dry-run command executed in temp directory outside repo (`%TEMP%\saans_pip_test`):
```powershell
pip download -r requirements.txt -d wheels --platform manylinux2014_x86_64 --python-version 3.12 --only-binary=:all: --implementation cp
```
**Return Code:** `0` (Success without needing `--no-deps`).

| Package | Version Resolved | Wheel Status | Pure Python / Binary Detail |
| :--- | :--- | :--- | :--- |
| `pydantic` | 2.14.0 | **PASS** | `pydantic-2.14.0-py3-none-any.whl` + `pydantic_core-2.50.0-cp312-cp312-manylinux2014_x86_64.whl` |
| `Pillow` | 12.2.0 | **PASS** | `pillow-12.2.0-cp312-cp312-manylinux2014_x86_64.whl` |
| `pygeohash` | 3.5.1 | **PASS** | `pygeohash-3.5.1-cp312-cp312-manylinux1_x86_64.manylinux_2_28_x86_64.whl` |
| `annotated-types` | 0.8.0 | **PASS** | `annotated_types-0.8.0-py3-none-any.whl` |
| `typing-extensions`| 4.16.0 | **PASS** | `typing_extensions-4.16.0-py3-none-any.whl` |
| `typing-inspection`| 0.4.4 | **PASS** | `typing_inspection-0.4.4-py3-none-any.whl` |

*Note on `pygeohash`:* A pre-built binary manylinux wheel was matched and downloaded directly (`pygeohash-3.5.1`). Even if fallback to sdist occurs, `pygeohash` is pure Python algorithms (Morton order interleaving) with zero C extensions, making it fully safe on Linux Lambda.

---

### 3. Build-Breakers & Package Limits

1. **Globals Runtime / Architecture:**
   - [infra/template.yaml:26-28](file:///d:/BharatBuilds/infra/template.yaml#L26-L28): `Runtime: python3.12`, `Architectures: [x86_64]`. Matches wheel target platform.
2. **Missing `__init__.py` (CRITICAL IMPORT BREAKERS):**
   - [services/agents/common/](file:///d:/BharatBuilds/services/agents/common): **MISSING `__init__.py`!** Breaking import of `agents.common.runner` and `agents.common.model` in packaged Lambda environments.
   - [services/api/auth/](file:///d:/BharatBuilds/services/api/auth): **MISSING `__init__.py`!** Breaking import of handler `api.auth.pre_signup.handler`.
3. **Handler Path Audit (all 17 functions):**
   All 17 function handlers point to valid files under `services/`:
   - `PreSignupFunction` -> `api.auth.pre_signup.handler` (File exists)
   - `HealthFunction` -> `api.handlers.health.handler` (File exists)
   - `FarmerPlanFunction` -> `api.handlers.farmer_plan.handler` (File exists)
   - `FarmerBookFunction` -> `api.handlers.farmer_book.handler` (File exists)
   - `SlotRefreshFunction` -> `api.handlers.slot_refresh.handler` (File exists)
   - `StrawOutletsFunction` -> `api.handlers.straw_outlets.handler` (File exists)
   - `TodayFunction` -> `api.handlers.today.handler` (File exists)
   - `WeatherFunction` -> `api.handlers.weather.handler` (File exists)
   - `AskFunction` -> `api.handlers.ask.handler` (File exists)
   - `MapLayersFunction` -> `api.handlers.map_layers.handler` (File exists)
   - `ReportsUploadUrlFunction` -> `api.handlers.reports_upload_url.handler` (File exists)
   - `ReportsClassifyFunction` -> `api.handlers.reports_classify.handler` (File exists)
   - `ReportsFunction` -> `api.handlers.reports.handler` (File exists)
   - `TriageFunction` -> `api.handlers.reports_triage.handler` (File exists)
   - `SubscriptionsFunction` -> `api.handlers.subscriptions.handler` (File exists)
   - `ProfileFunction` -> `api.handlers.profile.handler` (File exists)
   - `IngestFunction` -> `ingest.handler.handler` (File exists)
4. **Lambda Unzipped Size Estimate:**
   - Raw `services/` source code: **0.51 MB**
   - Unzipped dependencies (`pydantic`, `pillow`, `pygeohash`, `pydantic-core`): **~29.5 MB**
   - Total uncompressed package: **~30.0 MB**, comfortably under the **250 MB** Lambda limit.
5. **Local-Only Packages:**
   - None remaining once `strands-agents` is deleted.

---

### 4. Template Parameters & `samconfig.toml`

- In [infra/template.yaml:13-18](file:///d:/BharatBuilds/infra/template.yaml#L13-L18):
  ```yaml
  BedrockModelId:
    Type: String
  BedrockVisionModelId:
    Type: String
  ```
  Neither parameter has a default value.
- In both [samconfig.toml:11](file:///d:/BharatBuilds/samconfig.toml#L11) and [infra/samconfig.toml:11](file:///d:/BharatBuilds/infra/samconfig.toml#L11):
  ```toml
  parameter_overrides = "Stage=\"dev\""
  ```
- **BLOCKER:** `samconfig.toml` does **NOT** supply `BedrockModelId` or `BedrockVisionModelId`. Deploying without explicit parameter overrides will cause CloudFormation / SAM to fail validation or prompt interactively.

---

## B. ROUTE PARITY

### Route Parity Audit Table

| Frontend Call (`lib/api/client.ts`) | Method | Path | Handler Exists | Template Event | Authorizer | OPTIONS / CORS | Verdict |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `apiClient.health` | GET | `/v1/health` | Yes ([health.py](file:///d:/BharatBuilds/services/api/handlers/health.py#L5)) | `GetHealth` ([template.yaml:382](file:///d:/BharatBuilds/infra/template.yaml#L382)) | NONE | OK | **PASS** |
| `apiClient.weather(id)` | GET | `/v1/weather` | Yes ([weather.py](file:///d:/BharatBuilds/services/api/handlers/weather.py#L110)) | `GetWeather` ([template.yaml:516](file:///d:/BharatBuilds/infra/template.yaml#L516)) | Cognito (Default) | OK | **PASS (Requires Token)** |
| `apiClient.farmer.plan(data)` | POST | `/v1/farmer/plan` | Yes ([farmer_plan.py](file:///d:/BharatBuilds/services/api/handlers/farmer_plan.py#L22)) | `PostFarmerPlan` ([template.yaml:412](file:///d:/BharatBuilds/infra/template.yaml#L412)) | Cognito (Default) | OK | **PASS** |
| `apiClient.farmer.book(data)` | POST | `/v1/farmer/book` | Yes ([farmer_book.py](file:///d:/BharatBuilds/services/api/handlers/farmer_book.py#L31)) | `PostFarmerBook` ([template.yaml:433](file:///d:/BharatBuilds/infra/template.yaml#L433)) | Cognito (Default) | OK | **PASS** |
| `apiClient.farmer.getBookings()` | GET | `/v1/farmer/bookings` | Yes ([farmer_book.py](file:///d:/BharatBuilds/services/api/handlers/farmer_book.py#L31)) | `GetFarmerBookings` ([template.yaml:439](file:///d:/BharatBuilds/infra/template.yaml#L439)) | Cognito (Default) | OK | **PASS** |
| `apiClient.farmer.strawOutlets(id)`| GET | `/v1/farmer/straw-outlets` | Yes ([straw_outlets.py](file:///d:/BharatBuilds/services/api/handlers/straw_outlets.py#L18))| `GetStrawOutlets` ([template.yaml:480](file:///d:/BharatBuilds/infra/template.yaml#L480)) | Cognito (Default) | OK | **PASS** |
| `apiClient.citizen.today(id)` | GET | `/v1/today` | Yes ([today.py](file:///d:/BharatBuilds/services/api/handlers/today.py#L22)) | `GetToday` ([template.yaml:499](file:///d:/BharatBuilds/infra/template.yaml#L499)) | Cognito (Default) | OK | **PASS** |
| `apiClient.citizen.ask(data)` | POST | `/v1/ask` | Yes ([ask.py](file:///d:/BharatBuilds/services/api/handlers/ask.py#L24)) | `PostAsk` ([template.yaml:533](file:///d:/BharatBuilds/infra/template.yaml#L533)) | Cognito (Default) | OK | **PASS (Returns mock answers)** |
| `apiClient.map.layers(bbox)` | GET | `/v1/map/layers` | Yes ([map_layers.py](file:///d:/BharatBuilds/services/api/handlers/map_layers.py#L27)) | `GetMapLayers` ([template.yaml:554](file:///d:/BharatBuilds/infra/template.yaml#L554)) | Cognito (Default) | OK | **PASS** |
| `reports.uploadUrl(data)` | POST | `/v1/reports/upload-url` | Yes ([reports_upload_url.py](file:///d:/BharatBuilds/services/api/handlers/reports_upload_url.py#L21)) | `PostUploadUrl` ([template.yaml:571](file:///d:/BharatBuilds/infra/template.yaml#L571)) | Cognito (Default) | OK | **PASS** |
| `reports.classify(data)` | POST | `/v1/reports/classify` | Yes ([reports_classify.py](file:///d:/BharatBuilds/services/api/handlers/reports_classify.py#L22)) | `PostClassify` ([template.yaml:591](file:///d:/BharatBuilds/infra/template.yaml#L591)) | Cognito (Default) | OK | **FAIL (Uses text model ID for vision)** |
| `reports.submit(data)` | POST | `/v1/reports` | Yes ([reports.py](file:///d:/BharatBuilds/services/api/handlers/reports.py#L42)) | `PostReports` ([template.yaml:629](file:///d:/BharatBuilds/infra/template.yaml#L629)) | Cognito (Default) | OK | **PASS** |
| `reports.get(options)` | GET | `/v1/reports` | Yes ([reports.py](file:///d:/BharatBuilds/services/api/handlers/reports.py#L42)) | `GetReports` ([template.yaml:617](file:///d:/BharatBuilds/infra/template.yaml#L617)) | Cognito (Default) | OK | **PASS** |
| `reports.getById(id)` | GET | `/v1/reports/{report_id}` | Yes ([reports.py](file:///d:/BharatBuilds/services/api/handlers/reports.py#L42)) | `GetReport` ([template.yaml:623](file:///d:/BharatBuilds/infra/template.yaml#L623)) | Cognito (Default) | OK | **PASS** |
| `reports.delete(id)` | DELETE | `/v1/reports/{id}` | Yes ([reports.py](file:///d:/BharatBuilds/services/api/handlers/reports.py#L42)) | `DeleteReports` ([template.yaml:635](file:///d:/BharatBuilds/infra/template.yaml#L635)) | Cognito (Default) | OK | **PASS** |
| `subscriptions.create(data)` | POST | `/v1/subscriptions` | Yes ([subscriptions.py](file:///d:/BharatBuilds/services/api/handlers/subscriptions.py#L22)) | `PostSubscriptions` ([template.yaml:684](file:///d:/BharatBuilds/infra/template.yaml#L684)) | Cognito (Default) | OK | **PASS** |
| `subscriptions.get()` | GET | `/v1/subscriptions` | Yes ([subscriptions.py](file:///d:/BharatBuilds/services/api/handlers/subscriptions.py#L22)) | `GetSubscriptions` ([template.yaml:690](file:///d:/BharatBuilds/infra/template.yaml#L690)) | Cognito (Default) | OK | **PASS** |
| `subscriptions.delete()` | DELETE | `/v1/subscriptions` | Yes ([subscriptions.py](file:///d:/BharatBuilds/services/api/handlers/subscriptions.py#L22)) | `DeleteSubscriptions` ([template.yaml:696](file:///d:/BharatBuilds/infra/template.yaml#L696)) | Cognito (Default) | OK | **FAIL (IAM deny on unsubscribe)** |
| `auth.getProfile()` | GET | `/v1/profile` | Yes ([profile.py](file:///d:/BharatBuilds/services/api/handlers/profile.py#L18)) | `GetProfile` ([template.yaml:713](file:///d:/BharatBuilds/infra/template.yaml#L713)) | Cognito (Default) | OK | **PASS** |
| `auth.saveProfile(data)` | POST | `/v1/auth/profile` | Yes ([profile.py](file:///d:/BharatBuilds/services/api/handlers/profile.py#L18)) | `PostAuthProfile` ([template.yaml:719](file:///d:/BharatBuilds/infra/template.yaml#L719)) | Cognito (Default) | OK | **PASS** |

### Preflight & 403-Preflight Symptom Root Cause

1. **`AddDefaultAuthorizerToCorsPreflight: false`:**
   Configured at [infra/template.yaml:352](file:///d:/BharatBuilds/infra/template.yaml#L352). This ensures SAM generates Mock OPTIONS integration methods with `Authorizer: NONE`.
2. **`GatewayResponses` (DEFAULT_4XX / DEFAULT_5XX):**
   Configured at [infra/template.yaml:356-368](file:///d:/BharatBuilds/infra/template.yaml#L356-L368) with `Access-Control-Allow-Origin: "'*'"`.
3. **The 403-Preflight Symptom Explanation:**
   - In [apps/web/lib/api/client.ts:53-54](file:///d:/BharatBuilds/apps/web/lib/api/client.ts#L53-L54), the client unconditionally injects `Content-Type: application/json` into **all** requests, including `GET /v1/weather` and `GET /v1/farmer/bookings`. This header turns simple GET requests into CORS preflight-mandatory requests in browser engines.
   - When calling AWS API Gateway REST APIs, if the requested URL does not include the stage prefix (e.g., calling `https://...amazonaws.com/v1/weather` instead of `https://...amazonaws.com/dev/v1/weather`), API Gateway's root router cannot find any matching resource.
   - For any unmapped resource or incorrect stage path, API Gateway defaults to `403 Forbidden` (`{"message":"Missing Authentication Token"}`).
   - Furthermore, if preflight headers sent by the browser contain unlisted request headers, or if an unauthenticated user loads `/farmer` before logging in, the Cognito Authorizer rejects the call before Lambda execution.

---

## C. IAM vs CODE

Comprehensive audit of AWS SDK calls made in code versus policies granted in [infra/template.yaml](file:///d:/BharatBuilds/infra/template.yaml):

| Function | Code AWS API Calls (Methods & Tables) | `template.yaml` Policies | Audit Finding / Discrepancy |
| :--- | :--- | :--- | :--- |
| **`PreSignupFunction`** | None (Cognito event transform) | None | **Match** |
| **`HealthFunction`** | None | None | **Match** |
| **`FarmerPlanFunction`** | `dynamodb:GetItem` (DataCache)<br>`dynamodb:PutItem` (DataCache, AgentRuns)<br>`dynamodb:UpdateItem` (DataCache for rate limiting via [ratelimit.py:30](file:///d:/BharatBuilds/services/api/common/ratelimit.py#L30))<br>`dynamodb:Query` (MachineSlots)<br>`dynamodb:Query` (StrawOutlets)<br>`bedrock:InvokeModel` / `Converse` | `DataCacheTable` Read & Write<br>`MachineSlotsTable` Read<br>`StrawOutletsTable` Read<br>`AgentRunsTable` Crud<br>`AgentBedrockPolicy` | **DISCREPANCY (P0):** `AgentBedrockPolicy` ARN statement restricts inference profiles to account-owned ones (`arn:...:${AWS::AccountId}:inference-profile/...`). System-defined cross-region profiles (e.g. `apac.anthropic.claude-3-5-sonnet...`) do not contain account IDs. See details below. |
| **`FarmerBookFunction`** | `dynamodb:GetItem` (UsersTable at [farmer_book.py:68](file:///d:/BharatBuilds/services/api/handlers/farmer_book.py#L68))<br>`dynamodb:GetItem` (BookingsTable)<br>`dynamodb:TransactWriteItems` (MachineSlotsTable Update + BookingsTable Put at [farmer_book.py:101](file:///d:/BharatBuilds/services/api/handlers/farmer_book.py#L101))<br>`dynamodb:Query` (BookingsTable) | `MachineSlotsTable` Crud<br>`BookingsTable` Crud<br>`UsersTable` Read ([template.yaml:430](file:///d:/BharatBuilds/infra/template.yaml#L430)) | **Match:** Policy explicitly grants `DynamoDBReadPolicy` on `UsersTable` and `DynamoDBCrudPolicy` on `MachineSlotsTable` and `BookingsTable`. |
| **`SlotRefreshFunction`**| `dynamodb:BatchWriteItem` (MachineSlotsTable at [slot_refresh.py:119](file:///d:/BharatBuilds/services/api/handlers/slot_refresh.py#L119)) | Inline Statement: `PutItem`, `BatchWriteItem`, `UpdateItem` on `MachineSlotsTable.Arn` ([template.yaml:457](file:///d:/BharatBuilds/infra/template.yaml#L457)) | **Match:** Sufficient and least-privilege. |
| **`StrawOutletsFunction`**| `dynamodb:Query` (StrawOutletsTable) | `StrawOutletsTable` Read | **Match** |
| **`TodayFunction`** | `dynamodb:GetItem` (DataCacheTable)<br>`dynamodb:Query` (ReportsTable, SubscriptionsTable) | `DataCacheTable` Read<br>`ReportsTable` Read | **MISSING (P1):** [today.py:84](file:///d:/BharatBuilds/services/api/handlers/today.py#L84) queries `SubscriptionsTable` if present, but `SubscriptionsTable` ReadPolicy is missing from `TodayFunction` policies in `template.yaml:493`. |
| **`WeatherFunction`** | `dynamodb:GetItem` (DataCacheTable) | `DataCacheTable` Read | **Match** |
| **`AskFunction`** | `dynamodb:GetItem` (DataCacheTable) | `DataCacheTable` Read | **Match** for current mock stub; lacks `AgentBedrockPolicy` if live Bedrock Ask is wired. |
| **`MapLayersFunction`** | `dynamodb:GetItem` / `Query` (DataCacheTable, ReportsTable, MachineSlotsTable) | `DataCacheTable` Read<br>`ReportsTable` Read<br>`MachineSlotsTable` Read | **Match** |
| **`ReportsUploadUrlFunction`**| `s3:generate_presigned_url` (Client-side HMAC signing) | `ReportsBucket` S3CrudPolicy ([template.yaml:568](file:///d:/BharatBuilds/infra/template.yaml#L568)) | **Match** |
| **`ReportsClassifyFunction`**| `s3:GetObject` (ReportsBucket)<br>`s3:PutObject` (ReportsBucket stripped image)<br>`bedrock:InvokeModel` / `Converse` | `ReportsBucket` S3CrudPolicy<br>`AgentBedrockPolicy` | **DISCREPANCY (P0):** Code at [reports_classify.py:68](file:///d:/BharatBuilds/services/api/handlers/reports_classify.py#L68) calls `structured_complete(..., image=...)`, but [model.py:74](file:///d:/BharatBuilds/services/agents/common/model.py#L74) passes `config.BEDROCK_MODEL_ID` instead of `config.BEDROCK_VISION_MODEL_ID`. |
| **`ReportsFunction`** | `dynamodb:PutItem`, `GetItem`, `Query`, `UpdateItem`, `DeleteItem` (ReportsTable)<br>`dynamodb:UpdateItem` (DataCacheTable rate limit)<br>`lambda:InvokeFunction` (TriageFunction at [reports.py:154](file:///d:/BharatBuilds/services/api/handlers/reports.py#L154)) | `ReportsTable` Crud<br>`DataCacheTable` Crud<br>Inline Statement: `lambda:InvokeFunction` on `TriageFunction.Arn` ([template.yaml:612](file:///d:/BharatBuilds/infra/template.yaml#L612)) | **Match** |
| **`TriageFunction`** | `dynamodb:Scan`, `UpdateItem` (ReportsTable at [triage/tools.py:50](file:///d:/BharatBuilds/services/agents/triage/tools.py#L50))<br>`dynamodb:PutItem` (AgentRunsTable)<br>`bedrock:InvokeModel` / `Converse` | `ReportsTable` Crud<br>`DataCacheTable` Crud<br>`AgentRunsTable` Crud<br>`AgentBedrockPolicy` | **Match** |
| **`SubscriptionsFunction`**| `dynamodb:GetItem`, `PutItem`, `DeleteItem` (SubscriptionsTable)<br>`sns:Subscribe` (AlertsTopic)<br>`sns:Unsubscribe` (SubscriptionArn at [subscriptions.py:46](file:///d:/BharatBuilds/services/api/handlers/subscriptions.py#L46)) | `SubscriptionsTable` Crud<br>`AlertsTopic` SNSPublishMessagePolicy<br>Inline: `sns:Subscribe`, `sns:Unsubscribe` on `AlertsTopic` | **DISCREPANCY (P1):** In [template.yaml:682](file:///d:/BharatBuilds/infra/template.yaml#L682), `sns:Unsubscribe` resource is `!Ref AlertsTopic`. In AWS IAM, the ARN resource for `sns:Unsubscribe` is the **Subscription ARN** (`arn:aws:sns:*:*:*:*`), not the Topic ARN. Unsubscribing will fail with `AccessDeniedException`. |
| **`ProfileFunction`** | `dynamodb:GetItem`, `PutItem` (UsersTable) | `UsersTable` Crud | **Match** |
| **`IngestFunction`** | `dynamodb:PutItem`, `GetItem`, `BatchWriteItem` (DataCacheTable)<br>`ssm:GetParameter` (FIRMS, OpenAQ keys) | Inline: `DataCacheTable` CRUD actions<br>Inline: `ssm:GetParameter` on specific parameter ARNs ([template.yaml:750](file:///d:/BharatBuilds/infra/template.yaml#L750)) | **Match** |

### Detailed Bedrock IAM ARN Defect
In [infra/template.yaml:64-67](file:///d:/BharatBuilds/infra/template.yaml#L64-L67):
```yaml
Resource:
  - !Sub arn:aws:bedrock:${AWS::Region}::foundation-model/${BedrockModelId}
  - !Sub arn:aws:bedrock:${AWS::Region}:${AWS::AccountId}:inference-profile/${BedrockModelId}
  - !Sub arn:aws:bedrock:${AWS::Region}::foundation-model/${BedrockVisionModelId}
  - !Sub arn:aws:bedrock:${AWS::Region}:${AWS::AccountId}:inference-profile/${BedrockVisionModelId}
```
1. **System-Defined Inference Profiles:** AWS-managed inference profiles (such as `apac.anthropic.claude-3-5-sonnet-20241022-v2:0`) have ARNs formatted without account IDs: `arn:aws:bedrock:ap-south-1::inference-profile/apac.anthropic...`. Because the template includes `${AWS::AccountId}`, AWS IAM will reject calls with `AccessDeniedException`.
2. **Cross-Region Calls:** If text models are invoked in `us-east-1` (due to model quotas in `ap-south-1`), the IAM resource specifies `${AWS::Region}` (`ap-south-1`), which will block cross-region invocation. The ARN resource must allow `arn:aws:bedrock:*::foundation-model/*` and `arn:aws:bedrock:*::inference-profile/*`.

---

## D. ENVIRONMENT

### Environment Variables Audit

| Config / Env Key | Read In Code (`services/`) | Set In `template.yaml` Globals? | Consequences if Missing / Mismatched |
| :--- | :--- | :--- | :--- |
| `STAGE` | [config.py:12](file:///d:/BharatBuilds/services/api/common/config.py#L12), [health.py:15](file:///d:/BharatBuilds/services/api/handlers/health.py#L15) | Yes (`!Ref Stage`) | None |
| `AWS_REGION` | [config.py:13](file:///d:/BharatBuilds/services/api/common/config.py#L13), tools & handlers | Injected by Lambda runtime (`AWS_REGION`) | None |
| `USERS_TABLE` | [config.py:16](file:///d:/BharatBuilds/services/api/common/config.py#L16), [farmer_book.py:64](file:///d:/BharatBuilds/services/api/handlers/farmer_book.py#L64), [profile.py](file:///d:/BharatBuilds/services/api/handlers/profile.py) | Yes (`!Ref UsersTable`) | None |
| `REPORTS_TABLE` | [config.py:17](file:///d:/BharatBuilds/services/api/common/config.py#L17), [reports.py:113](file:///d:/BharatBuilds/services/api/handlers/reports.py#L113), [triage/tools.py](file:///d:/BharatBuilds/services/agents/triage/tools.py) | Yes (`!Ref ReportsTable`) | None |
| `MACHINE_SLOTS_TABLE` | [config.py:18](file:///d:/BharatBuilds/services/api/common/config.py#L18), [farmer_book.py](file:///d:/BharatBuilds/services/api/handlers/farmer_book.py), [slot_refresh.py](file:///d:/BharatBuilds/services/api/handlers/slot_refresh.py) | Yes (`!Ref MachineSlotsTable`) | None |
| `STRAW_OUTLETS_TABLE` | [config.py:19](file:///d:/BharatBuilds/services/api/common/config.py#L19), [straw_outlets.py](file:///d:/BharatBuilds/services/api/handlers/straw_outlets.py) | Yes (`!Ref StrawOutletsTable`) | None |
| `BOOKINGS_TABLE` | [config.py:20](file:///d:/BharatBuilds/services/api/common/config.py#L20), [farmer_book.py](file:///d:/BharatBuilds/services/api/handlers/farmer_book.py) | Yes (`!Ref BookingsTable`) | None |
| `SUBSCRIPTIONS_TABLE`| [config.py:21](file:///d:/BharatBuilds/services/api/common/config.py#L21), [subscriptions.py](file:///d:/BharatBuilds/services/api/handlers/subscriptions.py) | Yes (`!Ref SubscriptionsTable`) | None |
| `DATA_CACHE_TABLE` | [config.py:22](file:///d:/BharatBuilds/services/api/common/config.py#L22), [ratelimit.py](file:///d:/BharatBuilds/services/api/common/ratelimit.py), [cache.py](file:///d:/BharatBuilds/services/ingest/cache.py) | Yes (`!Ref DataCacheTable`) | None |
| `AGENT_RUNS_TABLE` | [config.py:23](file:///d:/BharatBuilds/services/api/common/config.py#L23), [runner.py:33](file:///d:/BharatBuilds/services/agents/common/runner.py#L33) | Yes (`!Ref AgentRunsTable`) | None |
| `REPORTS_BUCKET` | [config.py:26](file:///d:/BharatBuilds/services/api/common/config.py#L26), [reports_upload_url.py](file:///d:/BharatBuilds/services/api/handlers/reports_upload_url.py), [classify.py](file:///d:/BharatBuilds/services/api/handlers/reports_classify.py) | Yes (`!Ref ReportsBucket`) | None |
| `CACHE_BUCKET` | [config.py:27](file:///d:/BharatBuilds/services/api/common/config.py#L27) | **NO** | Unused in active code paths (DataCache uses DynamoDB). |
| `ALERTS_TOPIC_ARN` | [config.py:30](file:///d:/BharatBuilds/services/api/common/config.py#L30), [subscriptions.py:69](file:///d:/BharatBuilds/services/api/handlers/subscriptions.py#L69) | Yes (`!Ref AlertsTopic`) | None |
| `COGNITO_USER_POOL_ID` | [config.py:33](file:///d:/BharatBuilds/services/api/common/config.py#L33) | **NO** (Only exported in Outputs) | Backend auth uses event requestContext claims; config value is empty string. |
| `COGNITO_CLIENT_ID` | [config.py:34](file:///d:/BharatBuilds/services/api/common/config.py#L34) | **NO** (Only exported in Outputs) | None in backend. |
| `MODEL_PROVIDER` | [config.py:37](file:///d:/BharatBuilds/services/api/common/config.py#L37), [model.py:10](file:///d:/BharatBuilds/services/agents/common/model.py#L10) | Yes (`"bedrock"`) | None |
| `BEDROCK_MODEL_ID` | [config.py:38](file:///d:/BharatBuilds/services/api/common/config.py#L38), [model.py:15](file:///d:/BharatBuilds/services/agents/common/model.py#L15) | Yes (`!Ref BedrockModelId`) | Parameter must be provided during deploy. |
| `BEDROCK_VISION_MODEL_ID`| [config.py:39](file:///d:/BharatBuilds/services/api/common/config.py#L39) | Yes (`!Ref BedrockVisionModelId`) | Parameter must be provided during deploy. |
| `BEDROCK_REGION` | [config.py:40](file:///d:/BharatBuilds/services/api/common/config.py#L40), [model.py:16](file:///d:/BharatBuilds/services/agents/common/model.py#L16) | Yes (`!Ref AWS::Region`) | Defaults to Lambda region (`ap-south-1`). |
| `TRIAGE_FUNCTION_NAME`| [reports.py:144](file:///d:/BharatBuilds/services/api/handlers/reports.py#L144) | Set per-function on `ReportsFunction` | None |
| `FIRMS_API_KEY_PARAM`| [firms.py:32](file:///d:/BharatBuilds/services/ingest/firms.py#L32) | Yes (`!Sub /saans/${Stage}/firms-api-key`) | Required in SSM Parameter Store. |
| `OPENAQ_API_KEY_PARAM`| [aqi.py](file:///d:/BharatBuilds/services/ingest/aqi.py) | Yes (`!Sub /saans/${Stage}/openaq-api-key`) | Required in SSM Parameter Store. |

### Frontend `NEXT_PUBLIC_*` Variables

Comparison between [apps/web/.env.example](file:///d:/BharatBuilds/apps/web/.env.example) and code usage:
- `NEXT_PUBLIC_API_URL`: Defined in `.env.example`, read in [client.ts:27](file:///d:/BharatBuilds/apps/web/lib/api/client.ts#L27).
- `NEXT_PUBLIC_API_MODE`: Defined in `.env.example`, read in [client.ts:26](file:///d:/BharatBuilds/apps/web/lib/api/client.ts#L26).
- `NEXT_PUBLIC_AUTH_MODE`: Defined in `.env.example`, read in [authClient.ts](file:///d:/BharatBuilds/apps/web/lib/auth/authClient.ts).
- `NEXT_PUBLIC_COGNITO_USER_POOL_ID`: Defined in `.env.example`, read in [cognitoAuth.ts](file:///d:/BharatBuilds/apps/web/lib/auth/cognitoAuth.ts).
- `NEXT_PUBLIC_COGNITO_CLIENT_ID`: Defined in `.env.example`, read in [cognitoAuth.ts](file:///d:/BharatBuilds/apps/web/lib/auth/cognitoAuth.ts).
- `NEXT_PUBLIC_AWS_REGION`: Defined in `.env.example`, read in [cognitoAuth.ts](file:///d:/BharatBuilds/apps/web/lib/auth/cognitoAuth.ts).
- **MISSING FROM `.env.example`:** `NEXT_PUBLIC_USE_MOCKS`. Used in [apps/web/lib/api/client.ts:31](file:///d:/BharatBuilds/apps/web/lib/api/client.ts#L31) (`export const isMockMode = process.env.NEXT_PUBLIC_USE_MOCKS === 'true';`). Must be documented in `.env.example`.

---

## E. AGENTS, STEP BY STEP (PLANNER & TRIAGE)

### Execution Trace 1: Farmer in Rajpura / Patiala
- **Input:** `village_id="village-patiala-001"`, `crop_stage="harvested"`, `language="en"`, `user_id="usr-pat-01"`.
- **Step 1: Rate Limiter & Cache Check:**
  - `DataCacheTable` queried with `source="ratelimit"`, `key="ratelimit#user#usr-pat-01#plan#2026-10-11"`. Increment atomic counter. Pass limit (30/day).
  - `DataCacheTable` queried with `source="plan"`, `key="usr-pat-01|village-patiala-001|harvested|en|2026-10-11"`. Cache miss.
- **Step 2: Weather & Wind Data Gathering:**
  - `DataCacheTable` queried with `source="open_meteo"`, `key="village-patiala-001"`.
  - Ingest writes 7-day forecast (`2026-10-11` to `2026-10-17`). If ingest has run, returns `live` (`is_sample=False`). If not, fallback returns synthetic clear days (`is_sample=True`).
- **Step 3: FIRMS Fire Hotspots:**
  - `resolve_district_from_village_or_name("village-patiala-001")` returns `"patiala"`.
  - Queries `DataCacheTable` with `source="firms"`, `key="district-patiala"`. Ingest writes key `district-patiala`. Found.
- **Step 4: Sowing Window Calculation:**
  - Sowing window for `harvested` in [scoring_config.yaml:7-8](file:///d:/BharatBuilds/services/agents/planner/scoring_config.yaml#L7-L8) is `10-01` to `11-15`.
  - As of today (`2026-10-11`), `today_ist()` is inside `2026-10-01` .. `2026-11-15`.
  - Returns `sowing_window_status="inside"`, bonus +25 points.
- **Step 5: Machine Slots:**
  - Queries `MachineSlotsTable` with PK `village-patiala-001`, SK between `2026-10-11` and `2026-10-17`.
  - Seed generated 21 forward days of slots. Found Happy Seeder (`slots_free=3`).
- **Step 6: Straw Outlets Fallback:**
  - Queries `StrawOutletsTable` with PK `district_id="patiala"`. Found 3 seeded outlets (`outlet-001`, `outlet-002`, `outlet-003`). Deterministically ranked by distance from village coordinates `(30.48, 76.59)`.
- **Step 7: Scorer & Replanner:**
  - Scores each of the 7 days (summing rain, wind, fire, sowing window, machine availability).
  - Best day selected (e.g. `2026-10-12`, score ~85). Machine available: `machine_opt` attached.
- **Step 8: AI Explanation (Bedrock Converse):**
  - Calls `structured_complete(AgentReasoning, prompt)` using Bedrock Converse API.
  - Returns structured `reason_text` in English.
- **Step 9: Output & Audit:**
  - Writes execution trace to `AgentRunsTable`.
  - Writes plan to `DataCacheTable` (source="plan", TTL=6 hours).
  - Returns HTTP 200 `PlanResult`.

### Execution Trace 2: Farmer in Karnal
- **Input:** `village_id="village-karnal-001"`, `crop_stage="standing"`, `language="hi"`.
- **Step 1: FIRMS & Outlets Key Format:**
  - `resolve_district_from_village_or_name("village-karnal-001")` returns `"karnal"`.
  - Queries FIRMS key `district-karnal`. Written by `ingest/firms.py:23` as `district-karnal`. Exact match.
  - Queries Straw Outlets PK `karnal`. Seeded in `straw_outlets.json:112` as `district_id: "karnal"`. Exact match.
- **Step 2: Sowing Window for "Standing" Stage:**
  - Window in [scoring_config.yaml:13-14](file:///d:/BharatBuilds/services/agents/planner/scoring_config.yaml#L13-L14) is `10-20` to `11-30`.
  - Requested 7-day window is `2026-10-11` to `2026-10-17`.
  - Because `check_end ("2026-10-17") < sw_start ("2026-10-20")`, [scoring.py:58](file:///d:/BharatBuilds/services/agents/planner/scoring.py#L58) sets:
    `sowing_window_status="before"`.
  - Penalty -25 points applied. `message_key="sowing_window_before"`.
- **Step 3: Machine Slots:**
  - `village-karnal-001` queries `MachineSlotsTable`. Seeded via `machines.json:57` (`slot-007`, Happy Seeder, 3 slots free).
- **Step 4: AI Explanation:**
  - `structured_complete(AgentReasoning, prompt)` generates Hindi reasoning explaining that the standing crop window has not yet begun.

### Execution Trace 3: New Real Report in Delhi NCR
- **Input:** Citizen submits `POST /v1/reports` with `photo_key="reports/usr-del-01/abc.jpg"`, `location={"lat": 28.6692, "lng": 77.3055}` (Anand Vihar), `category="crop_burning"`.
- **Step 1: Submission Handler (`ReportsFunction`):**
  - Encodes coordinates with `pygeohash`: `geohash="ttng3e..."`.
  - Enforces user rate limit (`MAX_REPORTS_PER_USER_PER_HOUR=5`).
  - Writes item to `ReportsTable`: `report_id="rpt-..."`, `status="received"`, `ttl=now+30d`.
  - Asynchronously invokes `TriageFunction` via `boto3.lambda.invoke(InvocationType="Event")`.
  - Returns HTTP 201 `{ status: "received", report_id: "rpt-..." }`.
- **Step 2: Async Triage Execution (`TriageFunction`):**
  - `_handle_async_event` queries nearby reports using `find_nearby_reports()`.
  - `find_nearby_reports()` filters out sample records:
    [triage/tools.py:60](file:///d:/BharatBuilds/services/agents/triage/tools.py#L60): `if item.get("is_sample") or item.get("user_id") == "sample": continue`.
    **Sample reports are safely ignored!**
  - **Duplicate Merge Rules:** If a real report with category `crop_burning` exists within 24h within proximity, `merge_into()` increments `duplicate_count` on the original and updates current report to `status="merged"`.
  - **Single Incident Path:** If no duplicates, Bedrock triage runs via `structured_complete(TriageAssessment)`. Confidence 0.85 -> `next_action="route_department"`.
  - Updates `ReportsTable`: `SET #status = "routed", priority = "high", routing_label = "simulated_department_dispatch"`.
- **Step 3: Frontend Polling Contract:**
  - Citizen report page polls `getReport(report_id)` (`GET /v1/reports/{report_id}`).
  - Returns `status: "routed"` as soon as `TriageFunction` completes.

### Model Cost & Limit Enforcement

- **Cost per Plan Run:** 1 Bedrock Converse call for explanation (~400 input tokens, ~80 output tokens). If using Claude 3.5 Sonnet: ~$0.0024 per run.
- **Cost per Triage Run:** 1 Bedrock Converse call (~350 input tokens, ~60 output tokens): ~$0.0019 per run.
- **Cost per Classify Run:** 1 Bedrock Vision Converse call (1 image block + ~200 input tokens, ~40 output tokens): ~$0.0050 per run.
- **Limits Enforced in Code:**
  - `AgentRunner`: `MAX_AGENT_STEPS=8`, `AGENT_TIMEOUT_SECONDS=20` ([config.py:43-44](file:///d:/BharatBuilds/services/api/common/config.py#L43-L44)).
  - `check_rate_limit`: Per-user limit = 30 plans/day, global limit = 500 plans/day ([ratelimit.py:25-26](file:///d:/BharatBuilds/services/api/common/ratelimit.py#L25-L26)).

---

## F. DATA AND SEEDS

### Seed Script Comparison

| Property | `scripts/seed.py` | `scripts/seed_demo.py` |
| :--- | :--- | :--- |
| **Target Tables** | `MachineSlotsTable`<br>`StrawOutletsTable`<br>`DataCacheTable` (villages & wards) | `MachineSlotsTable`<br>`StrawOutletsTable`<br>`ReportsTable` |
| **MachineSlots Output** | 21 forward days (`today_ist()` to `today_ist() + 20d`) for all 8 villages. `is_sample=True`. | 21 forward days (`today_ist()` to `today_ist() + 20d`) for all 8 villages. `is_sample=True`. |
| **StrawOutlets Output** | 12 outlets across Patiala, Ludhiana, Sangrur, Karnal (`district_id` lowercase). | 12 outlets across Patiala, Ludhiana, Sangrur, Karnal (`district_id` lowercase). |
| **Reports Output** | Does not write to ReportsTable. | Writes 8 sample reports with `user_id="sample"`, `is_sample=True`, **no TTL**. |
| **DataCache Output** | Writes individual (`source="villages"`, `key=village_id`) + `key="all"` and (`source="wards"`, `key=ward_id`) + `key="all"`. | Does not write to DataCacheTable. |
| **Idempotency** | Yes (`batch_writer` overwrites keys deterministically). | Yes (`batch_writer` overwrites keys deterministically). |

### Deployment & Post-Deploy Run Order

1. **Deploy:** `sam build` then `sam deploy`.
2. **Step 1:** Run `python scripts/seed.py --stage dev` (populates `MachineSlotsTable`, `StrawOutletsTable`, and `DataCacheTable` with village/ward metadata).
3. **Step 2:** Run `python scripts/seed_demo.py --stage dev` (populates sample community reports in `ReportsTable`).
4. **Step 3:** Trigger `IngestFunction` manually via AWS CLI (fetches live Open-Meteo weather for all 15 locations and writes to `DataCacheTable`).

### Open-Meteo Ingest Field Mapping & UI Display

In [services/ingest/open_meteo.py:213-236](file:///d:/BharatBuilds/services/ingest/open_meteo.py#L213-L236):
- Ingest requests: `temperature_2m`, `apparent_temperature`, `relative_humidity_2m`, `weather_code`, `wind_speed_10m`, `wind_direction_10m`, `daily` (`temperature_2m_max`, `temperature_2m_min`, `precipitation_probability_max`, `uv_index_max`, `sunset`), `hourly` (`visibility`).
- **Hourly 24h Summary Nuance:** Open-Meteo ingest only requests `hourly: "visibility"`; it does **NOT** request hourly `temperature_2m`.
- **UI Fallback Behavior:** In [services/api/handlers/weather.py:94-107](file:///d:/BharatBuilds/services/api/handlers/weather.py#L94-L107), when raw hourly temperature points are absent, `_build_hourly_summary` synthesizes a 24h summary from `curr_temp`. Consequently, **no tile shows `—`**; all dashboard tiles (feels like, visibility, UV, sunset, humidity, rain chance) display populated numbers.

---

## G. FRONTEND <-> BACKEND CONTRACT

| Screen | Request Path & Payload | Backend Response Keys | Frontend Type / Mapper | Mismatch / Guard Analysis |
| :--- | :--- | :--- | :--- | :--- |
| **`/farmer`** | `GET /v1/weather?location_id=`<br>`POST /v1/farmer/plan`<br>`GET /v1/farmer/bookings` | `WeatherResponse`<br>`PlanResult`<br>`FarmerBookingsResponse` | `mapWeatherToSnapshot` ([farmer/page.tsx:32](file:///d:/BharatBuilds/apps/web/app/farmer/page.tsx#L32))<br>`PlanResult` type<br>`FarmerBookingsResponse` | **Guard:** [farmer/page.tsx:204](file:///d:/BharatBuilds/apps/web/app/farmer/page.tsx#L204) checks `isWithinWeekIST(plan.best_day)`. If best day is outside 6 days from today, hides plan and displays empty state. |
| **`/farmer/field`** | `POST /v1/farmer/plan`<br>`{ village_id, crop_stage, language }` | `PlanResult` (`best_day`, `score`, `score_breakdown`, `machine_option`, `straw_outlets`, `reason_text`, `tool_trace`) | `PlanResult` | **Cache & Guard:** Caches last plan in `localStorage.setItem('lastPlanResult')`. Revalidates with `isWithinWeekIST`. |
| **`/farmer/book`** | `POST /v1/farmer/book`<br>`{ slot_id, village_id, date, idempotency_key }` | `{ booking_id, status, slot, is_sample }` | `MachineOption` | **Contract OK.** URL query params pre-fill slot details. |
| **`/farmer/straw-outlets`**| `GET /v1/farmer/straw-outlets?district=` | `{ outlets: [...] }` | `StrawOutlet[]` | **Contract OK.** Client requests lowercase district name. |
| **`/citizen`** | `GET /v1/today?area_id=`<br>`GET /v1/weather?location_id=`<br>`GET /v1/reports?limit=50` | `TodayResponse`<br>`WeatherResponse`<br>`{ reports: [...] }` | `TodayResponse`<br>`CommunityReport[]` | **Contract OK.** |
| **`/citizen/today`** | `GET /v1/today?area_id=`<br>`GET /v1/weather?location_id=` | `TodayResponse`<br>`WeatherResponse` | `TodayResponse` | **Contract OK.** Displays AQI hero and hourly strip. |
| **`/citizen/report`** | `POST /v1/reports/upload-url`<br>`PUT` to S3 presigned URL<br>`POST /v1/reports/classify`<br>`POST /v1/reports` | `{ upload_url, photo_key }`<br>`{ category, confidence }`<br>`{ report_id, status }` | `Report` | **CONTRACT BREAK (P0):** Classify fails on backend due to model ID bug (modelId text model passed to vision block). |
| **`/map`** | `GET /v1/map/layers` | `{ fires: [...], aqi_stations: [...], machines: [...], straw_outlets: [...], reports: [...] }` | `MapLayers` | **Contract OK.** All 5 layer keys match. |
| **`ProfileCard`** | `GET /v1/profile`<br>`POST /v1/auth/profile` | Snake_case user profile | `mapProfileResponse` in [client.ts:550](file:///d:/BharatBuilds/apps/web/lib/api/client.ts#L550) | **Contract OK.** Maps snake_case backend keys to camelCase UI fields (`land_size_acres` -> `landSizeAcres`). |

---

## H. S3 / UPLOADS

1. **Bucket CORS Configuration:**
   - In [infra/template.yaml:92-101](file:///d:/BharatBuilds/infra/template.yaml#L92-L101):
     ```yaml
     CorsConfiguration:
       CorsRules:
         - AllowedOrigins:
             - !Ref AllowedOrigin # default "*"
           AllowedMethods:
             - PUT
           AllowedHeaders:
             - "*"
           MaxAge: 3600
     ```
2. **Presigned PUT Conditions & Frontend Headers:**
   - [reports_upload_url.py:74-82](file:///d:/BharatBuilds/services/api/handlers/reports_upload_url.py#L74-L82) signs with `ContentType: content_type` (`image/jpeg`).
   - In [apps/web/lib/api/client.ts:151-157](file:///d:/BharatBuilds/apps/web/lib/api/client.ts#L151-L157):
     ```typescript
     const res = await fetch(uploadUrl, {
       method: 'PUT',
       headers: { 'Content-Type': contentType },
       body: file,
     });
     ```
     The header matches S3 signing parameters exactly.
3. **The "Failed to fetch" on Report Page:**
   - When running against an undeployed or misconfigured backend, `getUploadUrl()` returns a mock or invalid URL.
   - If the S3 bucket is undeployed, or if the browser's origin (`http://localhost:3000`) is rejected prior to S3 deployment, the browser triggers a network error (`TypeError: Failed to fetch`).
4. **Classify Image Handling:**
   - `reports_classify.py:45` calls `s3.get_object(Bucket=bucket, Key=photo_key)`.
   - Strips EXIF metadata using Pillow and re-uploads clean bytes (`s3.put_object`).
   - **CRITICAL DEFECT:** In [model.py:74](file:///d:/BharatBuilds/services/agents/common/model.py#L74), `structured_complete` hardcodes `modelId=config.BEDROCK_MODEL_ID`. When `image` bytes are passed, Bedrock will throw `ValidationException` if `BEDROCK_MODEL_ID` is a text-only model or an inference profile that does not accept vision input in Converse API.

---

## I. NOT BUILT OR PARTIAL FEATURES

1. **Alerts & Subscriptions:**
   - Backend handler exists (`services/api/handlers/subscriptions.py`).
   - **Frontend UI is NOT BUILT:** There is no subscription page, banner, toast, or browser Notification API integration in `apps/web`.
2. **Monitoring Agent:**
   - Code exists at `services/agents/monitor/agent.py`.
   - **Not in `template.yaml`:** There is no Lambda function or EventBridge scheduled rule configured for the monitor agent.
3. **Citizen Ask Agent:**
   - Route and handler exist (`POST /v1/ask`).
   - Returns hardcoded preset dictionary answers ([ask.py:61-66](file:///d:/BharatBuilds/services/api/handlers/ask.py#L61-L66)). Model is not invoked.
4. **Demo Mode ("Diwali Night" Scenario):**
   - Mentioned in `Plan.md:277`.
   - **NOT BUILT:** No toggle, query parameter, or switch exists in code.
5. **Sample Past Bookings for New Farmer:**
   - `farmer_book.py:181` queries `BookingsTable` for the authenticated `user_id`. Newly signed-up farmers see 0 bookings and 0 impact stats until their first booking is submitted.

---

## J. VERDICT TABLE

| Feature | Works After Deploy + Seed? | Confidence | Blocking Reason with `file:line` | Fix Needed (One Line) | Est. Minutes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Farmer Plan (Scoring & Trace)** | **YES** | HIGH | None in deterministic scoring. Strands removal needed for build. | Remove strands import in [planner/agent.py:20](file:///d:/BharatBuilds/services/agents/planner/agent.py#L20) & [tools.py:12](file:///d:/BharatBuilds/services/agents/planner/tools.py#L12). | 15 min |
| **Plan AI Explanation** | **LIKELY** | MEDIUM | [template.yaml:65](file:///d:/BharatBuilds/infra/template.yaml#L65) restricts inference profile ARN to AccountId. | Update `AgentBedrockPolicy` resource to support AWS system-defined inference profiles. | 5 min |
| **Booking Creation** | **YES** | HIGH | None. TransactWriteItems and UsersTable read are fully permitted. | None. | 0 min |
| **Bookings List & Impact** | **YES** | HIGH | Empty for new users until a booking is submitted. | None (Works; shows 0 bookings until booked). | 0 min |
| **Straw Outlets & Ranking** | **YES** | HIGH | None. Seed writes lowercase district keys matching queries. | None. | 0 min |
| **Farmer Weather** | **YES** | HIGH | None once Ingest function has executed. | None. | 0 min |
| **Citizen Today / AQI** | **YES** | HIGH | None once Ingest function has executed. | None. | 0 min |
| **Citizen Weather** | **YES** | HIGH | None once Ingest function has executed. | None. | 0 min |
| **Community Reports Feed** | **YES** | HIGH | None once `seed_demo.py` writes sample reports. | None. | 0 min |
| **Report Photo Upload** | **YES** | HIGH | None once S3 bucket is deployed. | None. | 0 min |
| **Report Classify (Vision AI)** | **NO** | HIGH | [services/agents/common/model.py:74](file:///d:/BharatBuilds/services/agents/common/model.py#L74) hardcodes `BEDROCK_MODEL_ID` instead of `BEDROCK_VISION_MODEL_ID`. | In `structured_complete`, select `modelId = config.BEDROCK_VISION_MODEL_ID if image else config.BEDROCK_MODEL_ID`. | 5 min |
| **Report Submit & Triage** | **LIKELY** | MEDIUM | [template.yaml:65](file:///d:/BharatBuilds/infra/template.yaml#L65) inference profile ARN restriction. | Fix Bedrock IAM resource ARN in `template.yaml`. | 5 min |
| **Map Layers** | **YES** | HIGH | None. Reads DataCache, Reports, and MachineSlots. | None. | 0 min |
| **Profile Read & Save** | **YES** | HIGH | None. UsersTable permissions match. | None. | 0 min |
| **Cognito Pre-Signup Auth** | **NO** | HIGH | [services/api/auth/](file:///d:/BharatBuilds/services/api/auth) missing `__init__.py`. | Add empty `services/api/auth/__init__.py`. | 1 min |
| **Alerts / Subscriptions** | **NO** | HIGH | No frontend UI; [template.yaml:682](file:///d:/BharatBuilds/infra/template.yaml#L682) SNS unsubscribe IAM error. | Expand SNS unsubscribe resource in `template.yaml` and build client UI. | 30 min |
| **Landing Cards / Phone Slides** | **YES** | HIGH | Pure client-side components with sample badges. | None. | 0 min |

---

## NUMBERED FIX LIST (ORDERED P0 -> P1 -> P2)

### P0 (Blocks Build, Deployment, or Core Demo)

1. **[services/requirements.txt:4](file:///d:/BharatBuilds/services/requirements.txt#L4):**
   Delete `strands-agents` from `requirements.txt` to eliminate `pywin32` build failure on Windows.
2. **[services/agents/common/__init__.py](file:///d:/BharatBuilds/services/agents/common):**
   Create an empty `__init__.py` in `services/agents/common/` so `agents.common.runner` and `agents.common.model` can be imported in packaged Lambda.
3. **[services/api/auth/__init__.py](file:///d:/BharatBuilds/services/api/auth):**
   Create an empty `__init__.py` in `services/api/auth/` so `PreSignupFunction` handler `api.auth.pre_signup.handler` can be imported.
4. **[infra/template.yaml:13-18](file:///d:/BharatBuilds/infra/template.yaml#L13-L18) & [samconfig.toml:11](file:///d:/BharatBuilds/samconfig.toml#L11):**
   Add default values for `BedrockModelId` and `BedrockVisionModelId` in `template.yaml` or define them in `samconfig.toml` `parameter_overrides`.
5. **[infra/template.yaml:64-67](file:///d:/BharatBuilds/infra/template.yaml#L64-L67):**
   In `AgentBedrockPolicy`, update resource ARNs to allow system-defined inference profiles without AccountId: `- !Sub arn:aws:bedrock:${AWS::Region}::inference-profile/*` and allow foundation models across regions if cross-region inference is used.
6. **[services/agents/common/model.py:74](file:///d:/BharatBuilds/services/agents/common/model.py#L74):**
   In `structured_complete()`, set `model_id = config.BEDROCK_VISION_MODEL_ID if image else config.BEDROCK_MODEL_ID` and pass `modelId=model_id` to `client.converse`.
7. **[services/agents/planner/agent.py:20-79](file:///d:/BharatBuilds/services/agents/planner/agent.py#L20-L79) & [services/agents/planner/tools.py:12](file:///d:/BharatBuilds/services/agents/planner/tools.py#L12):**
   Remove `strands` imports and replace the strands `Agent` wrapper with direct tool invocation.
8. **[services/agents/triage/agent.py:16](file:///d:/BharatBuilds/services/agents/triage/agent.py#L16) & [services/agents/triage/tools.py:4](file:///d:/BharatBuilds/services/agents/triage/tools.py#L4):**
   Remove unused `from strands import Agent` and `@tool` decorators from triage agent and tools.

### P1 (Functional Breaks in Secondary Features)

9. **[infra/template.yaml:682](file:///d:/BharatBuilds/infra/template.yaml#L682):**
   In `SubscriptionsFunction` IAM statements, expand `sns:Unsubscribe` resource from `!Ref AlertsTopic` to `*` (or subscription ARN pattern) so unsubscription does not throw `AccessDeniedException`.
10. **[infra/template.yaml:493](file:///d:/BharatBuilds/infra/template.yaml#L493):**
    Add `DynamoDBReadPolicy: TableName: !Ref SubscriptionsTable` to `TodayFunction` policies in `template.yaml`.
11. **[apps/web/.env.example:6](file:///d:/BharatBuilds/apps/web/.env.example#L6):**
    Add `NEXT_PUBLIC_USE_MOCKS=false` to `.env.example`.

### P2 (Missing Features & Polish)

12. **[services/agents/monitor/agent.py:19](file:///d:/BharatBuilds/services/agents/monitor/agent.py#L19):**
    Remove dead `from strands import Agent` import from monitor agent.
13. **[apps/web/app/farmer/page.tsx:1](file:///d:/BharatBuilds/apps/web/app/farmer/page.tsx#L1):**
    Move `WeatherSnapshot` type definition from `mock/dashboardData` into `lib/types/` so dashboard does not import from mock folder in production build.
14. **[services/api/handlers/ask.py:60](file:///d:/BharatBuilds/services/api/handlers/ask.py#L60):**
    Connect `AskFunction` to Bedrock Converse instead of returning static answers.

---

## DEPLOYMENT & VERIFICATION COMMAND SEQUENCE

Once the P0 fixes above are applied, execute the following commands in exact order:

```powershell
# 1. Build without Docker (on Windows)
cd d:\BharatBuilds
sam build -t infra/template.yaml

# 2. Deploy to AWS
sam deploy --config-file infra/samconfig.toml `
  --parameter-overrides `
    Stage="dev" `
    BedrockModelId="apac.anthropic.claude-3-5-sonnet-20241022-v2:0" `
    BedrockVisionModelId="apac.anthropic.claude-3-5-sonnet-20241022-v2:0"

# 3. Seed base data (Machine slots, straw outlets, villages/wards cache)
python scripts/seed.py --stage dev

# 4. Seed demo data (Sample reports in ReportsTable)
python scripts/seed_demo.py --stage dev

# 5. Trigger Ingestion Lambda to populate live Open-Meteo weather
aws lambda invoke `
  --function-name saans-ingest-dev `
  --region ap-south-1 `
  --invocation-type RequestResponse `
  ingest-result.json
```

---

## MANUAL VERIFICATION CHECKLIST

Items that cannot be verified offline and must be confirmed in the AWS Console or via AWS CLI:

1. **Bedrock Model Access in Target Region:**
   - Verify Claude 3.5 Sonnet / Haiku model access is granted in your account.
   - Command:
     ```powershell
     aws bedrock get-foundation-model-availability --model-id anthropic.claude-3-5-sonnet-20241022-v2:0 --region ap-south-1
     ```
   - Console Path: `AWS Console > Amazon Bedrock > Model access (ap-south-1 or us-east-1)`.
2. **Inference Profile Availability:**
   - Confirm the inference profile ID exists in `ap-south-1`.
   - Command:
     ```powershell
     aws bedrock list-inference-profiles --region ap-south-1
     ```
3. **SSM Parameter Store Keys for Ingest:**
   - Verify `/saans/dev/firms-api-key` and `/saans/dev/openaq-api-key` exist if live NASA FIRMS / OpenAQ fetching is required.
   - Command:
     ```powershell
     aws ssm get-parameter --name "/saans/dev/firms-api-key" --region ap-south-1
     ```
   - Console Path: `AWS Systems Manager > Parameter Store`.
4. **API Gateway CORS & Live Invocation:**
   - Check preflight OPTIONS response headers after deployment:
     ```powershell
     curl -I -X OPTIONS https://<api-id>.execute-api.ap-south-1.amazonaws.com/dev/v1/health `
       -H "Origin: http://localhost:3000" `
       -H "Access-Control-Request-Method: GET"
     ```
5. **CloudWatch Log Streams:**
   - Check execution logs for `FarmerPlanFunction` and `TriageFunction`:
     ```powershell
     aws logs tail /aws/lambda/saans-farmer-plan-dev --follow --region ap-south-1
     ```
