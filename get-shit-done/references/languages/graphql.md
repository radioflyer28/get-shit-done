# GraphQL — Security Checks

## Code Vulnerabilities (OWASP)

**Introspection & Schema Exposure:**
- Introspection enabled in production: `introspection: true` — full schema disclosure
- `__schema` and `__type` queries accessible — complete API map
- Schema SDL export endpoints — same as introspection but file-based
- Field-level descriptions containing internal notes, TODOs, or implementation details
- Deprecated fields still functional — often less secured, forgotten attack surface

**Query Complexity & DoS:**
- Deeply nested queries: `{ user { posts { comments { author { posts { ... } } } } } }` — N+1 amplification
- No query depth limiting — recursive relationships enable exponential query cost
- No query complexity/cost analysis — heavy fields (aggregations, joins) counted same as simple fields
- Alias-based batching: `{ a1: user(id:1) { email } a2: user(id:2) { email } ... a1000: user(id:1000) }` — batch amplification
- Fragment-based amplification: recursive fragments consuming server resources
- Missing rate limiting on GraphQL endpoint (single `/graphql` URL for everything)
- `@skip` / `@include` directives not counted in complexity analysis — bypass cost limits
- Subscription abuse: opening many WebSocket subscriptions → connection exhaustion

**Authorization:**
- Field-level authorization missing — resolver returns data without checking permissions
- Type-level auth but not field-level: `User { email, adminNotes }` — admin fields on user type
- `@auth` / `@hasRole` directives only on query/mutation but not on type fields
- Nested resolver authorization bypass: `posts { author { secretField } }` — parent auth doesn't cascade
- Mutation authorization issues: `createUser` checking role but `updateUser` not
- Subscription authorization: initial auth check but no re-verification on pushes
- Schema-stitching / federation: gateway auth but subgraph resolvers unprotected
- Relay-style `node(id: "base64id")` interface — IDOR if ID is guessable/enumerable

**Injection:**
- SQL injection in custom resolvers: `db.query("SELECT * FROM users WHERE name = '" + args.name + "'")`
- NoSQL injection: `db.collection.find({ $where: args.filter })`
- LDAP injection in directory-backed resolvers
- OS command injection in resolvers calling system commands
- Server-Side Request Forgery: resolver fetching `args.url` — SSRF
- Template injection: resolver passing args to template engines

**Input Validation:**
- Missing `@constraint` / custom scalar validation — String fields accept any content
- `Int` type without range validation — overflow or business logic bypass
- `String` without max length — unbounded input
- Custom scalars (DateTime, Email, URL) without validation — declared type but no enforcement
- Input object types without field-level validation
- File upload via GraphQL multipart request — size, type, content not validated
- Enum values not enforced at resolver level — fallback to default

**Information Disclosure:**
- Verbose error messages: `{ "errors": [{ "message": "column \"user_password\" does not exist" }] }` — schema leak
- Stack traces in error responses: `extensions.exception.stacktrace`
- Suggestion feature: "Did you mean 'adminPassword'?" — field enumeration
- Query tracing (`extensions.tracing`) enabled — performance data leak, internal architecture
- `extensions.debug` data in production responses
- Error paths revealing resolver implementation: `path: ["user", "creditCard", "number"]`

**Batching & Multiplexing:**
- Query batching: `[{ query: "..." }, { query: "..." }, ...]` — bypass per-request rate limiting
- Persisted queries disabled: any query string accepted — larger attack surface
- `GET` requests with query in URL parameter — query caching, logging sensitive queries
- Automatic persisted queries (APQ) without allowlist — hash-based but still accepts arbitrary queries

**Schema Design Risks:**
- `Mutation { deleteDatabase(confirm: Boolean!): Boolean }` — destructive operations without sufficient guards
- Sensitive field on public type: `User { id, name, ssn, creditCard }` — should be separate authorized type
- `JSON` / `Object` scalar types — unstructured data bypass validation
- Recursive types without cycle detection: `type User { friends: [User] }`
- Wildcard field resolvers using `__resolveType` with user-controlled type names

## Threat Scan Patterns

**Suspicious GraphQL patterns:**
- Custom resolvers that execute shell commands based on query arguments
- Resolvers that forward requests to internal services based on user-controlled URLs (SSRF gateway)
- Custom directives that modify authorization logic — backdoor `@skipAuth` directive
- Subscription resolvers that forward all mutation events to external endpoints
- DataLoader implementations that log or exfiltrate aggregated data
- Schema extensions that add hidden admin mutations
- Custom scalars with `parseValue()` calling `eval()` or `exec()`
