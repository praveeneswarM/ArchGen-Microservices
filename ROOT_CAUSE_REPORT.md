# ROOT_CAUSE_REPORT.md

This report explains why the ArchGen frontend was entering mock mode and details the changes implemented to address the issue.

---

## 1. Where Mock Mode Message is Generated
The frontend toast message **"Mock Architecture Loaded - Loaded mock resource nodes. AI agents are mocked."** is generated in:
* **File**: `archgen-frontend/app/dashboard/page.tsx`
* **Lines**: ~162-164
* **Trigger condition**:
  ```typescript
  if (providerName === "mock") {
    showToast("info", "Mock Architecture Loaded", "Loaded mock resource nodes. AI agents are mocked.");
  }
  ```
  The toast is triggered dynamically whenever the active provider returned in the architecture payload (`architecture.active_provider`) is equal to `"mock"`.

---

## 2. Trace of Execution Path Triggering Mock Mode
1. The user requests architecture generation in the frontend.
2. The frontend triggers a `POST` request to `/api/generate-architecture` via the API Gateway proxy.
3. The request reaches `generate_architecture` in `architecture-service/routes/api.py`.
4. In the backend, `ProviderManager.generate_json` is called during the AI Architecture Generation step.
5. In `get_available_provider()`, the backend checks for the availability of LLM providers:
   * **OpenAI**: Checked if `OPENAI_API_KEY` is present.
   * **DeepSeek**: Checked if `DEEPSEEK_API_KEY` is present.
   * **Ollama**: Checked by making a health request to the local Ollama daemon at `http://localhost:11434/api/tags`.
6. Since no API keys were configured in `.env` and Ollama was not running or reachable locally, all checks failed.
7. Under the original implementation, when all providers failed, `ProviderManager` and `ResilientProvider` silently fell back to the hardcoded `Mock` provider:
   * `self.active_provider` was set to `'Mock'`.
   * `self.active_model` was set to `'mock'`.
   * A mock payload was returned using `OpenAIClient._generate_mock_response`.
8. Even when initial AI generation raised an exception and fell back to the deterministic engine, subsequent **AI Enrichment** agents (`SecurityOptimizationAgent`, `ComplexityAuditorAgent`, `CostOptimizationAgent`, `ArchitectureExplanationAgent`) were executed. Since no LLM was running, these enrichment agents called `generate_json`, which fell back to the `Mock` provider and overrode `active_provider` to `'Mock'`.
9. The backend returned `'Mock'` to the frontend, which triggered the toast and mock display.

---

## 3. Analysis of Root Cause Category
The root cause was determined to be **Provider Failure** (lack of configured API keys and offline local Ollama service) combined with **Hardcoded Mock Fallback Behavior** built into the backend provider managers.

---

## 4. Changes Implemented

### A. Removed Hardcoded Mock Fallback Behavior
* **`architecture-service/utils/provider_manager.py`**:
  * Default provider is initialized to `'None'`.
  * `get_available_provider` returns `'None'` if no provider is active.
  * `generate_json` raises a `RuntimeError` if no active provider is available, instead of silently calling `OpenAIClient._generate_mock_response`.
* **`architecture-service/utils/llm_provider.py`**:
  * Removed default fallback to `MockProvider()` inside `ResilientProvider`.
  * Raised a `RuntimeError` detailing the failures if all providers in the chain fail.
  * Initialized `ResilientProvider` with `fallback=None` inside `get_llm_provider()`.

### B. Enforced New Generation Pipeline
Refactored `generate_architecture` in `architecture-service/routes/api.py` to always run the pipeline in the following sequence:

$$\text{Deterministic Engine} \longrightarrow \text{Optional AI Enhancement Layer} \longrightarrow \text{Non-blocking Validation}$$

1. **Deterministic Engine (Primary Generator)**:
   * Runs first as the baseline generator using `InfrastructureReasoningEngine`.
   * Always succeeds in generating the correct 50+ node production-ready baseline architecture containing all required enterprise resources (subnets, NSGs, route tables, monitoring, backups, private endpoints, etc.).
2. **Optional AI Enhancement Layer**:
   * Evaluates if there is a valid, configured active LLM provider (i.e. not `'None'` or `'Mock'`).
   * If a provider is active, it calls the `RequirementAnalysisAgent`, `ArchitecturePlanningAgent`, and enrichment agents.
   * If the provider fails or is unconfigured, the AI Enhancement layer gracefully catches the error, logs a warning, and preserves the deterministic baseline topology without crashing.
3. **Non-blocking Validation**:
   * Runs Quality Gate validation checks on the final topology.
   * Instead of failing the entire request with an HTTP 500 status code, validation findings are collected as a list of strings and appended directly to the `warnings` list in the response.
   * The endpoint always returns `200 OK` with the generated topology and findings.
