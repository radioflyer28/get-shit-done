# FastAPI — Security Checks

> Parent: `python.md` — always load parent first.

## Framework-Specific Vulnerabilities

**Authentication & Authorization:**
- Missing `Depends()` on route — endpoints default to public, no auth required
- `Security(HTTPBearer())` without actual token validation — accepts any Bearer token
- Custom `OAuth2PasswordBearer` without scope enforcement
- `Depends(get_current_user)` missing on WebSocket routes — WebSocket auth often forgotten
- `@app.on_event("startup")` creating admin accounts with default credentials
- Missing rate limiting — FastAPI has no built-in rate limiter; check for `slowapi` or similar

**Response Model Exposure:**
- `response_model=UserModel` exposes password hashes, internal IDs, or secrets
- Missing `response_model_exclude` for sensitive fields
- `response_model=None` skips output validation — raw dict returned, may leak internal data
- `response_model_include` allowlist preferred over `response_model_exclude` denylist
- `orm_mode = True` / `from_attributes = True` returning full ORM objects without filtering

**Input Validation (Pydantic):**
- `Body(...)` without Pydantic model — raw dict, no validation
- `Query(regex=...)` with user-controlled regex — ReDoS
- `Path(...)` without type constraints — path traversal via `../`
- `validator` / `field_validator` with `pre=True` that calls `eval()` or `exec()`
- Missing `max_length` on `str` fields — unbounded input
- Missing `ge=0` / `le=` on numeric fields — integer overflow or business logic bypass
- `Annotated[str, Query()]` without validation — raw string pass-through
- `File(...)` / `UploadFile` without size limits or content-type validation

**Dependency Injection:**
- `Depends()` with `use_cache=True` (default) — shared state across requests if dep is mutable
- Generator dependencies (`yield`) without proper cleanup — resource leaks on exceptions
- Nested `Depends()` chains where inner dependency lacks auth — transitive bypass
- `request.state` used to pass auth context but not validated in downstream deps

**CORS & Middleware:**
- `CORSMiddleware(allow_origins=["*"], allow_credentials=True)` — credential theft
- `allow_methods=["*"]` — permits DELETE, PATCH on read-only endpoints
- `allow_headers=["*"]` — permits arbitrary headers
- Missing `TrustedHostMiddleware` — host header attacks
- Missing `HTTPSRedirectMiddleware` in production
- Middleware ordering: security middleware must come before route handlers

**SQL & Database:**
- `async with engine.connect() as conn: await conn.execute(text(f"...{user_input}"))` — SQLi
- SQLAlchemy `text()` with f-strings — see `sqlalchemy.md` for full patterns
- `databases` library with raw query strings
- Tortoise ORM `.raw()` with string formatting
- Missing connection pool limits — DoS via connection exhaustion

**Background Tasks:**
- `BackgroundTasks.add_task(func, sensitive_data)` — data persists in task queue
- Background tasks without error handling — silent failures
- Long-running background tasks without timeout — resource exhaustion
- Background task accessing `request` object — request may be closed

**WebSocket:**
- `@app.websocket("/ws")` without authentication check
- Missing origin validation on WebSocket connections
- `websocket.receive_text()` → `eval()` or `exec()` — RCE
- No message size limits — DoS via large WebSocket messages
- Missing heartbeat/timeout — zombie connections

**Error Handling:**
- Custom exception handlers returning `traceback.format_exc()` — stack trace leak
- `HTTPException(detail=str(exception))` — raw error details to client
- `debug=True` / `--reload` in production — auto-reload exposes file changes
- Missing generic 500 handler — default may expose Starlette debug info

**OpenAPI / Docs:**
- `/docs` and `/redoc` enabled in production — full API specification exposed
- `openapi_url="/openapi.json"` accessible — complete endpoint enumeration
- `include_in_schema=False` not set on internal/admin endpoints
- API key visible in Swagger UI "Authorize" dialog persisted in browser

## Threat Scan Patterns

**Suspicious FastAPI patterns:**
- `@app.middleware("http")` that logs or exfiltrates request bodies
- Custom `Depends()` that phone home on first call
- `BackgroundTasks` sending collected data to external URLs
- WebSocket endpoints forwarding all messages to external servers
- Startup events (`@app.on_event("startup")`) executing arbitrary code
- Lifespan handlers downloading and executing remote code
