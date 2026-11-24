# AUREX Cloud-First Architecture

## Product boundary
AUREX is a private, single-owner personal assistant, not a public SaaS product. The default deployment mode is cloud-only and must not silently fall back to a paired PC or local Ollama.

## Runtime topology
Owner browser/mobile -> HTTPS -> AUREX web UI -> Express API -> AI model provider + Supabase PostgreSQL.
API modules: owner authentication, assistant orchestration, research, persistent memory, task manager, planning, project blueprint generation, audit events and policy enforcement.
Future optional services: private object storage for artifacts, durable background workers, isolated cloud browser automation, and an optional outbound-connected PC Companion.

## Existing implementation
- Express API and health endpoint.
- Password hashing and JWT authentication.
- Conversations, messages, memories and pending actions in PostgreSQL.
- Assistant tool orchestration, web research, task management and planning.
- Desktop-agent bridge exists for a future hybrid mode.
- Cloud-only mode blocks desktop and local Ollama tools in the assistant dispatcher.

## Cloud-only safeguards
- Set AUREX_CLOUD_ONLY=true.
- Set AUREX_OWNER_EMAIL to the single owner email. Registration is rejected until configured and rejects any other email.
- Set OPENAI_API_KEY only in the hosting provider's secret environment.
- Set AUREX_MODEL to a model ID enabled for the configured API account. No guessed model default is used.
- Keep DATABASE_URL and JWT_SECRET server-side.
- Keep database access scoped by authenticated user ID.
- Never expose Ollama or a desktop-agent port publicly.
- Require explicit confirmation for publishing, sending, purchases and destructive changes.
- Never report success until a tool result verifies it.

## Service responsibilities
| Layer | Responsibility |
|---|---|
| Web UI | Crystal visualizer, chat, voice controls, memory/task/artifact views |
| API | Authentication, policy checks, orchestration, rate limits |
| AI adapter | Provider/model selection, tool calls and bounded retries |
| PostgreSQL | Users, conversations, messages, memories, tasks and audit |
| Object storage | Private generated files with short-lived download links |
| Worker | Long-running research, file generation and browser jobs |
| Browser worker | Isolated sessions, allow-listed domains, no local-device access |

## Voice design
Start with browser microphone permission and push-to-talk. Stream audio to a server-side speech provider only after explicit activation. Show a listening indicator and stop control. Wake-word support is optional and browser/device-dependent; do not promise always-on wake-word operation on mobile browsers.

## Background jobs and artifacts
Long-running tasks should use durable states: queued, running, waiting_for_approval, completed, failed, cancelled. Store output files in private object storage, associate each artifact with the owner, and verify file generation before showing a download action. Avoid storing large base64 files in chat rows.

## Deployment topology
Current Render Node service can serve the existing web directory and API. Supabase provides PostgreSQL. AI calls use a server-side provider API. A separate static frontend CDN can be introduced later with an explicit API origin and CORS allow-list.

## Known limitations
Cloud-only AUREX cannot inspect/control the owner's local desktop, local folders, installed applications, local Ollama model or offline machine. Cloud browser automation supports only websites that permit it and may be blocked by CAPTCHA, MFA, bot checks or site terms. Voice quality and latency depend on browser support, network and provider. AI, speech, storage and browser workers may incur usage charges. Missing credentials or provider outages disable the corresponding feature; the UI must show a clear unavailable state.