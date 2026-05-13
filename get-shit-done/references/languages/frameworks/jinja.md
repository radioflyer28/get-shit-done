# Jinja2 — Security Checks

> Parent: `python.md` — always load parent first.
> Related: `flask.md` (Flask uses Jinja2 by default), `django.md` (Django can use Jinja2 backend)

## Framework-Specific Vulnerabilities

**Server-Side Template Injection (SSTI):**
- `Template(user_input).render()` — user controls template source → RCE
- `Environment().from_string(user_input).render()` — same as above
- `render_template_string(user_input)` (Flask) — user-controlled template string → RCE
- SSTI exploitation chain: `{{ ''.__class__.__mro__[1].__subclasses__() }}` → find `subprocess.Popen` → RCE
- Safe: `render_template('page.html', var=user_input)` — user input is data, not template code

**Auto-escaping Bypass:**
- `{{ var|safe }}` — marks content as safe HTML, bypasses escaping → XSS
- `Markup(user_input)` — wraps string as safe, no escaping applied
- `{% autoescape false %}...{% endautoescape %}` — disables auto-escaping in block
- `Environment(autoescape=False)` — globally disables auto-escaping
- `Environment(autoescape=select_autoescape())` — only escapes `.html`/`.htm` by default; `.txt`, `.xml`, `.svg` templates are NOT auto-escaped
- Custom filters returning `Markup()` without sanitizing content
- `|e` (escape filter) manually applied but then `|safe` used later in same expression

**Sandbox Escape:**
- `SandboxedEnvironment` is NOT a security boundary for untrusted templates — known bypasses exist
- `{{ config }}` in Flask — exposes app configuration including `SECRET_KEY`
- `{{ request }}` — access to Flask request object, headers, cookies
- `{{ session }}` — access to Flask session data
- `{{ g }}` — access to Flask global context
- `{{ self.__init__.__globals__ }}` — Python global namespace access
- `{{ cycler.__init__.__globals__.os.popen('id').read() }}` — classic sandbox escape → RCE
- `{{ lipsum.__globals__ }}` — another common escape vector

**File Inclusion:**
- `{% include user_input %}` — if user controls include path → arbitrary template read
- `{% extends user_input %}` — template inheritance with user-controlled parent
- `FileSystemLoader(searchpath)` with overly broad search paths — template directory traversal
- `PackageLoader` pointing to writable directories

**Filter & Extension Risks:**
- Custom filters calling `eval()`, `exec()`, `os.system()`
- `do` extension (`jinja2.ext.do`) — allows statement execution in templates
- `loopcontrols` extension — less risky but increases template complexity
- `debug` extension — exposes internal state in output

**Configuration Hardening:**
- `Environment(autoescape=True)` — enable globally, not just for HTML files
- `Environment(undefined=StrictUndefined)` — raise on undefined variables instead of silent empty string
- Avoid `Environment(extensions=['jinja2.ext.do'])` unless strictly needed
- Use `SandboxedEnvironment` for any user-editable templates (imperfect but raises the bar)
- Pin `jinja2` version — older versions have known sandbox escapes

## Threat Scan Patterns

**Suspicious Jinja2 patterns:**
- Templates with `__class__`, `__mro__`, `__subclasses__` — SSTI exploitation attempts
- Template files containing `os.popen`, `subprocess`, `eval` — backdoor templates
- Custom Jinja2 extensions or filters that execute shell commands
- `FileSystemLoader` pointed at user-writable directories — template injection via filesystem
- Templates loading external URLs via custom filters — data exfiltration
