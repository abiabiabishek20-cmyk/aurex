# AUREX Cloud-Only Deployment Checklist

## Required environment
- [ ] DATABASE_URL — Supabase PostgreSQL connection string.
- [ ] JWT_SECRET — unique random secret with at least 32 random bytes.
- [ ] AUREX_OWNER_EMAIL — exact owner login email.
- [ ] OPENAI_API_KEY — server-side API key for the selected AI provider.
- [ ] AUREX_MODEL — model identifier enabled for that API account.
- [ ] AUREX_CLOUD_ONLY=true
- [ ] DATABASE_SSL=true
- [ ] NODE_ENV=production
- [ ] JWT_EXPIRES_IN=1h

Never put secrets in GitHub, chat, source files or browser JavaScript.

## Before first production login
- [ ] Confirm repository visibility is private before storing proprietary code.
- [ ] Confirm database backups are enabled.
- [ ] Configure owner email before registration.
- [ ] Test that registration rejects every email except the configured owner.
- [ ] Confirm API keys are server-side only.
- [ ] Confirm cloud-only mode rejects desktop and local Ollama tools.
- [ ] Confirm /api/health reports database connectivity.
- [ ] Test login, assistant chat, conversation persistence, memory, tasks and research.
- [ ] Verify logs do not contain passwords, JWTs, API keys or private message bodies.
- [ ] Set provider usage limits and budget alerts.
- [ ] Verify HTTPS and hosting access controls.

## Deployment is not complete until
1. Required environment variables are configured in Render.
2. Supabase schema is applied and the service connects.
3. The deployment build succeeds.
4. Owner-only registration and login are tested.
5. A real assistant request returns a response from the configured model.
6. Research returns source URLs.
7. The deployed UI is tested on mobile and desktop browsers.

Repository changes do not deploy the service or configure external accounts. Those steps require access to the user's Render and Supabase projects and the required secret values.