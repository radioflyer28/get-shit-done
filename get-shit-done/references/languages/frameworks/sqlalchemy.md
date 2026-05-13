# SQLAlchemy — Security Checks

> Parent: `python.md` — always load parent first.
> Related: `flask.md` (Flask-SQLAlchemy), `fastapi.md` (common async pairing)

## Framework-Specific Vulnerabilities

**SQL Injection (despite ORM):**
- `text(f"SELECT ... WHERE id={user_input}")` — f-string in `text()` construct → SQLi
- `text("SELECT ... WHERE id=%s" % user_input)` — %-formatting in `text()` → SQLi
- `text("SELECT ... WHERE id=" + user_input)` — concatenation in `text()` → SQLi
- `engine.execute("SELECT ... %s" % user_input)` — raw execute with formatting (legacy API)
- `session.execute(text("SELECT ... " + user_input))` — concatenation before `text()`
- `connection.execute(text(user_query))` — user controls entire query
- `.filter(text(user_input))` — raw SQL filter expression
- `.order_by(text(request.args['sort']))` — ORDER BY injection
- `.group_by(text(user_input))` — GROUP BY injection
- `column(user_input)` — dynamic column name → SQLi in SELECT clause
- `literal_column(user_input)` — renders as literal SQL → injection
- Safe: `session.execute(text("SELECT ... WHERE id=:id"), {"id": user_input})` — bound params
- Safe: `Model.query.filter(Model.id == user_input)` — ORM comparison generates parameterized SQL
- Safe: `Model.query.filter_by(id=user_input)` — keyword filter, parameterized

**Dynamic Query Construction:**
- `.filter(*[text(expr) for expr in user_list])` — user-controlled filter list
- `getattr(Model, user_field)` for dynamic column access without allowlist → info disclosure
- `.order_by(getattr(Model, sort_field))` without validating `sort_field` against model columns
- Building `or_()` / `and_()` conditions from user input without validation
- `func.` with user-controlled function name: `getattr(func, user_input)()` → arbitrary SQL function

**Connection & Engine:**
- `create_engine(url)` with credentials in URL string committed to git
- `create_engine(..., echo=True)` — logs all SQL including parameter values → credential/data leak
- `create_engine(..., pool_size=...)` without `max_overflow` — connection exhaustion
- `NullPool` in production — no connection reuse, performance issues under load
- `create_engine(..., connect_args={"check_same_thread": False})` (SQLite) — thread safety issues
- Missing `pool_pre_ping=True` — stale connections cause errors
- Connection string with `?sslmode=disable` — unencrypted database connection

**Session Management:**
- `session.commit()` in request handler without rollback on exception — partial writes
- Missing `session.close()` / scoped session cleanup — connection leaks
- `Session(expire_on_commit=False)` — stale data reads after commit
- Sharing `Session` across threads — not thread-safe (use `scoped_session`)
- `session.bulk_insert_mappings()` / `bulk_update_mappings()` without input validation
- `session.merge(user_object)` — can overwrite fields if object has unexpected attributes

**Relationship & Eager Loading:**
- `lazy='subquery'` or `lazy='joined'` loading user-controlled depth → DoS via deep nesting
- N+1 query patterns without `joinedload()` / `selectinload()` — not a security issue but performance DoS vector
- `backref` exposing parent through child — information disclosure via API serialization

**Event Listeners:**
- `@event.listens_for(Engine, "before_execute")` that logs queries with parameters — data leak
- `@event.listens_for(Session, "after_flush")` sending data externally — exfiltration
- Custom mapper events modifying data silently — integrity concerns

**Async SQLAlchemy (2.0+):**
- `AsyncSession` without proper `await session.close()` — connection pool exhaustion
- `async_scoped_session` with incorrect scope function — shared sessions across tasks
- `run_sync()` inside async context — blocks event loop
- `AsyncEngine` with sync operations — runtime errors or blocking

**Migration Safety (Alembic):**
- `op.execute("DROP TABLE ...")` in migration — destructive, verify intent
- Migration files with `op.execute(f"... {variable}")` — injection in migration scripts
- `op.alter_column()` changing type without data migration — data loss
- Downgrade migrations that don't restore data — irreversible
- Auto-generated migrations not reviewed — may drop columns/tables unexpectedly

## Threat Scan Patterns

**Suspicious SQLAlchemy patterns:**
- `@event.listens_for` handlers that POST data to external URLs — data exfiltration via DB events
- Custom `TypeDecorator` that executes code during type conversion
- `create_engine` URLs pointing to unexpected external databases
- Migration files that insert backdoor admin accounts or modify auth tables
- `session.execute(text(...))` with obfuscated or encoded query strings
- Connection event listeners that capture and forward credentials
