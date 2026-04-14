# Django — Security Checks

> Parent: `python.md` — always load parent first.

## Framework-Specific Vulnerabilities

**Template Injection & XSS:**
- `{{ var }}` is auto-escaped, but `{{ var|safe }}` bypasses escaping → XSS
- `{% autoescape off %}` block — disables auto-escaping for entire block
- `mark_safe(user_input)` — marks string as safe, skipping HTML escaping
- `format_html()` — intended for safe HTML construction, but developer misuse possible
- `Markup()` (Jinja2 engine) — Jinja2 has different auto-escaping defaults than Django templates
- Template tag injection: if user input controls template content loaded via `Template(user_string).render()` — SSTI → RCE

**SQL Injection (despite ORM):**
- `Model.objects.raw("SELECT ... %s" % user_input)` — string formatting in raw queries
- `Model.objects.extra(where=["name='%s'" % name])` — deprecated but used in legacy code
- `RawSQL(user_input)` — raw SQL expression
- `.annotate()` / `.aggregate()` with user-controlled `F()` expressions
- `connection.cursor().execute("..." % params)` — manual cursor with formatting
- `.order_by(request.GET['sort'])` — ORDER BY injection; validate against model field names
- Safe: `Model.objects.raw("SELECT ... WHERE id=%s", [user_input])` — parameterized

**Authentication & Authorization:**
- Missing `@login_required` / `LoginRequiredMixin` — views default to public
- `@csrf_exempt` on views — CSRF protection disabled
- `User.objects.get(pk=request.POST['id'])` — IDOR without ownership check
- `authenticate(username=..., password=...)` returning `None` not handled — login errors
- Custom `AUTHENTICATION_BACKENDS` without proper validation
- `is_staff` / `is_superuser` checked client-side but not server-side
- `SessionMiddleware` before `AuthenticationMiddleware` — required order
- Missing `SECURE_BROWSER_XSS_FILTER`, `SECURE_CONTENT_TYPE_NOSNIFF`
- `PASSWORD_HASHERS` with MD5 or SHA1 at top of list

**Settings (settings.py):**
- `DEBUG = True` in production — full tracebacks, settings dump, SQL queries
- `SECRET_KEY` committed to git or in `settings.py` — session forgery, token forging
- `ALLOWED_HOSTS = ['*']` — accepts any hostname → cache poisoning, host header attacks
- `CORS_ALLOW_ALL_ORIGINS = True` with `CORS_ALLOW_CREDENTIALS = True` — credential theft
- `SECURE_SSL_REDIRECT = False` — no HTTPS enforcement
- `SESSION_COOKIE_SECURE = False` — session cookie over HTTP
- `SESSION_COOKIE_HTTPONLY = False` — session cookie accessible to JavaScript
- `CSRF_COOKIE_SECURE = False` — CSRF cookie over HTTP
- `CSRF_TRUSTED_ORIGINS` with `*` or overly broad origins
- `X_FRAME_OPTIONS = 'ALLOWALL'` — clickjacking
- `EMAIL_HOST_PASSWORD` in plain `settings.py`

**File Uploads:**
- `request.FILES['file'].name` used directly — path traversal, overwrites
- `FileField` / `ImageField` without `upload_to` callable that sanitizes — predictable paths
- Missing `MAX_UPLOAD_SIZE` validation — DoS via large files
- `FileSystemStorage` in web root — uploaded files directly accessible
- `PIL.Image.open()` without verifying file content — polyglot file attacks
- `content_type` from upload header trusted without verification

**Admin:**
- Django admin (``/admin/``) accessible without IP restriction — brute-force target
- Custom admin actions without permission checks — any admin can execute
- Admin inline models exposing sensitive fields
- `ADMIN_SITE_URL` not customized (still `/admin/`) — easy to discover
- Missing `AdminSite.has_permission()` override for additional checks

**REST Framework (DRF):**
- `permission_classes = [AllowAny]` — public access
- `authentication_classes = []` — no auth
- `serializer.is_valid()` without `raise_exception=True` — validation errors silently ignored
- `ModelSerializer` without `fields` (or with `fields = '__all__'`) — exposes all model fields including password hashes
- `HyperlinkedModelSerializer` leaking internal IDs via URLs
- `@action` decorator without `permission_classes` — inherits viewset defaults (may be too permissive)
- `filter_backends` with `SearchFilter(search_fields=['=password'])` — exact match on password field
- `throttle_classes = []` — no rate limiting

**Middleware Order:**
- `SecurityMiddleware` must be first
- `CsrfViewMiddleware` must come before views
- `AuthenticationMiddleware` before any view that uses `request.user`
- Custom middleware that modifies `request.user` — ensure consistency with auth
