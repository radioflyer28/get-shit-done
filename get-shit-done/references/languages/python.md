# Python — Security Checks

> Also load framework-specific files when detected:
> - Django → `frameworks/django.md`
> - Flask → `frameworks/flask.md`
> - FastAPI → `frameworks/fastapi.md`
> - Jinja2 → `frameworks/jinja.md`
> - SQLAlchemy → `frameworks/sqlalchemy.md`

## Code Vulnerabilities (OWASP)

**Injection & Code Execution:**
- `eval()`, `exec()`, `compile()` with user input
- `subprocess.call(shell=True)` or `subprocess.run(shell=True)` with string interpolation
- `os.system()` with user-controlled arguments
- `__import__()` with dynamic strings
- `ast.literal_eval()` is safe for literals but not a general eval replacement — verify usage context

**Deserialization:**
- `pickle.loads()` / `pickle.load()` on untrusted data — arbitrary code execution
- `yaml.load()` without `Loader=SafeLoader` — code execution via `!!python/object`
- `marshal.loads()` on untrusted data
- `shelve.open()` on untrusted files (uses pickle internally)
- `jsonpickle.decode()` on untrusted input

**SQL Injection:**
- String formatting in SQL: `f"SELECT ... WHERE id={user_input}"`, `"...%s" % user_input`
- Missing parameterized queries in `sqlite3`, `psycopg2`, `sqlalchemy.text()`
- Raw SQL via ORM `.extra()`, `.raw()` with string interpolation

**Path Traversal:**
- `open(user_input)` without path validation
- `os.path.join(base, user_input)` without checking result stays under base
- `shutil.copy()`, `shutil.move()` with user-controlled paths
- Missing `os.path.realpath()` + prefix check for symlink resolution

**Authentication & Crypto:**
- `assert` used for security checks (stripped in `-O` optimized mode)
- `hashlib.md5()` / `hashlib.sha1()` for password hashing (use `bcrypt`, `argon2`, `scrypt`)
- `random.random()` / `random.randint()` for security tokens (use `secrets` module)
- Hardcoded `SECRET_KEY` in Django/Flask settings

**Framework-Specific:**
- Django: `mark_safe()` on user input, `|safe` template filter, `ALLOWED_HOSTS = ['*']`
- Flask: `debug=True` in production, missing `SESSION_COOKIE_SECURE`
- FastAPI: missing `Depends()` auth on endpoints, `response_model` exposing internal fields

## Threat Scan Patterns

**Suspicious Imports:**
- `ctypes` — FFI calls to native code, potential for shellcode execution
- `socket` + `subprocess` combination — reverse shell pattern
- `webbrowser.open()` — can trigger external actions
- `platform`, `getpass`, `pwd` — system/user info gathering
- `importlib` with computed module names — dynamic code loading

**Data Exfiltration Vectors:**
- `urllib.request.urlopen()` / `requests.post()` with gathered system data
- `smtplib` sending data via email
- `ftplib` uploading files
- `paramiko` / `fabric` SSH connections with unusual destinations

**Persistence:**
- Writing to `~/.bashrc`, `~/.profile`, `~/.config/autostart/`
- `crontab` manipulation via `subprocess`
- Modifying `sitecustomize.py` or `usercustomize.py`
- `.pth` files in site-packages (auto-executed on Python startup)
