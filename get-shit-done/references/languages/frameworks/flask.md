# Flask — Security Checks

> Parent: `python.md` — always load parent first.

## Framework-Specific Vulnerabilities

**Template Injection & XSS:**
- `{{ var }}` in Jinja2 is auto-escaped by default (since Flask 0.5), BUT:
- `{{ var|safe }}` — bypasses escaping → XSS
- `Markup(user_input)` — marks as safe
- `render_template_string(user_input)` — SSTI → RCE if user controls template content
- `render_template('page.html', content=user_input)` — safe (data, not template code)
- `{% autoescape false %}` block — disables escaping
- `app.jinja_env.autoescape = False` — globally disables auto-escaping
- Custom Jinja2 filters that return `Markup()` without sanitization

**Routing & Input:**
- `@app.route('/file/<path:filename>')` — path converter allows `/` in URL → path traversal
- `request.args.get('param')` used directly in file operations, SQL, or templates
- `request.form`, `request.json`, `request.data` — all untrusted; validate shapes
- `request.headers.get('X-Custom')` — user-controlled
- Missing method restriction: `@app.route('/delete')` defaults to GET only, but `methods=['GET', 'POST']` without CSRF
- `redirect(request.args.get('next'))` — open redirect

**Authentication & Sessions:**
- `app.secret_key = 'dev'` or weak/short secret — session forgery (Flask uses signed cookies)
- `SECRET_KEY` in source code — committed to git
- Flask session cookie is **signed but NOT encrypted** — users can decode session state (base64), just can't modify it
- Sensitive data in `session['credit_card']` — readable by user even though tamper-proof
- Missing `SESSION_COOKIE_SECURE = True` — cookie sent over HTTP
- Missing `SESSION_COOKIE_HTTPONLY = True` — cookie accessible to JavaScript
- Missing `SESSION_COOKIE_SAMESITE = 'Lax'` — CSRF via cookies
- `from flask_login import login_required` missing on views — public by default
- `login_user(user, remember=True)` with long `REMEMBER_COOKIE_DURATION` — persistent sessions
- `PERMANENT_SESSION_LIFETIME` too long

**CSRF:**
- Missing `flask-wtf` `CSRFProtect(app)` — no CSRF protection
- `@csrf.exempt` on sensitive endpoints
- AJAX requests without CSRF token header
- `WTF_CSRF_ENABLED = False` — globally disabled

**Database (SQLAlchemy):**
- `db.engine.execute("SELECT ... %s" % user_input)` — SQL injection
- `text(f"SELECT ... WHERE id={uid}")` — f-string in SQLAlchemy text()
- `session.execute(text("..."), {"param": user_input})` — safe when parameterized
- `.filter(text(user_input))` — raw SQL filter
- `.order_by(text(request.args['sort']))` — ORDER BY injection

**File Operations:**
- `send_from_directory(upload_dir, filename)` — safe if filename is sanitized, but `filename = request.args['f']` → traversal
- `send_file(user_path)` — arbitrary file read
- `secure_filename()` — strips dangerous chars; ALWAYS use for uploaded filenames
- `request.files['file'].save(os.path.join(upload_dir, filename))` without `secure_filename`
- Upload directory inside app static folder — files served directly

**Configuration:**
- `app.debug = True` / `FLASK_DEBUG=1` in production — interactive debugger → RCE (Werkzeug gives Python shell)
- `FLASK_ENV=development` in production — debug mode
- `PROPAGATE_EXCEPTIONS = True` — exposes tracebacks
- `TESTING = True` in production — alters behavior
- `app.config.from_pyfile('config.py')` — config file with secrets in repo
- Missing `ProxyFix` behind reverse proxy — `request.remote_addr` is proxy IP, not client
- `app.config['JSON_SORT_KEYS'] = True` — deterministic JSON output aids enumeration

**Extensions:**
- `flask-cors`: `CORS(app, resources={r"/*": {"origins": "*"}})` — allows all origins
- `flask-mail`: password in `MAIL_PASSWORD` config — ensure not committed
- `flask-admin`: admin views without authentication by default — override `is_accessible()`
- `flask-restful`: `reqparse` deprecated; use marshmallow or pydantic for validation
- `flask-jwt-extended`: `JWT_SECRET_KEY` weak or same as `SECRET_KEY`
