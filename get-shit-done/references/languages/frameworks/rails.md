# Ruby on Rails — Security Checks

> Parent: `ruby.md` — always load parent first.

## Framework-Specific Vulnerabilities

**Mass Assignment:**
- Missing `strong_parameters` — use `params.require(:model).permit(:field1, :field2)`
- `params.permit!` — permits everything (defeats the purpose)
- `permit` with nested attributes: `permit(address: {})` permits ALL address fields
- `accepts_nested_attributes_for` without `reject_if` — create/modify associated records
- `attr_accessible` (Rails 3) — deprecated but may exist in legacy code

**SQL Injection (despite ActiveRecord):**
- `User.where("name = '#{params[:name]}'")`— string interpolation in where
- `User.where("email LIKE '%#{params[:search]}%'")` — LIKE injection
- `.order(params[:sort])` — SQL injection via ORDER BY
- `.select(params[:fields])` — SELECT clause injection
- `.from(params[:table])` — table name injection
- `.pluck(params[:column])` — column injection
- `.group(params[:field])` — GROUP BY injection
- `.having("count > #{params[:count]}")` — HAVING injection
- `.joins(params[:assoc])` — JOIN injection
- `find_by_sql("SELECT ... #{params[:id]}")` — raw SQL
- `connection.execute("...")` with interpolation
- Safe: `User.where("name = ?", params[:name])` or `User.where(name: params[:name])`

**XSS (despite auto-escaping):**
- `raw(user_input)` — bypasses escaping
- `.html_safe` on user input — marks as safe
- `<%== user_input %>` — raw output (equivalent to `raw()`)
- `content_tag(:div, user_input.html_safe)` — XSS via html_safe
- `link_to user_input, "javascript:#{user_input}"` — protocol XSS
- `render inline: user_input` — template injection
- `sanitize()` helper — allows some HTML by default; check allowlisted tags/attributes
- `strip_tags()` — not security-safe, can be bypassed; use `sanitize()`

**Authentication & Sessions:**
- `has_secure_password` without password complexity validation
- `authenticate()` timing — Rails uses `bcrypt` (constant-time), but custom auth may not
- `reset_session` missing after login/logout — session fixation
- `session[:user_id]` without regeneration on role change
- Missing `config.force_ssl = true` — sessions sent over HTTP
- `protect_from_forgery with: :null_session` — CSRF token failure silently nullifies session (API-safe, but confusing for web)
- `protect_from_forgery with: :exception` — correct for web apps
- `skip_before_action :verify_authenticity_token` — disabling CSRF for specific actions without alternative protection

**File Operations:**
- `send_file(params[:path])` — arbitrary file download; validate against allowed directory
- `send_data` with user-controlled filename — download name manipulation
- `ActiveStorage` — blob URLs are signed but may be guessable if key leaked
- `Paperclip` / `CarrierWave` without content type validation — upload executable files
- `IO.read(params[:file])` — path traversal

**Configuration & Deployment:**
- `config.consider_all_requests_local = true` in production — detailed errors to everyone
- `config.log_level = :debug` in production — logging sensitive data
- `Rails.application.credentials` without `master.key` protection — encrypted secrets with weak key
- `SECRET_KEY_BASE` committed to git or weak — session forgery
- `seed.rb` with production data or default admin accounts
- `config.action_dispatch.default_headers` missing security headers
- `Rack::Attack` not configured — no rate limiting
- `config.hosts` (Rails 6+) not set — DNS rebinding attacks

**Deserialization:**
- `YAML.load()` — can instantiate arbitrary objects → RCE. Use `YAML.safe_load()`
- `Marshal.load()` — arbitrary object instantiation → RCE
- `GlobalID::Locator.locate(params[:sgid])` — Signed Global IDs; ensure the signer key is secret
- `MessageVerifier` / `MessageEncryptor` — if `SECRET_KEY_BASE` leaks, attacker can forge any signed value

**Routing:**
- `resources :users` — creates ALL CRUD routes; use `only:` or `except:` to restrict
- `match '/:controller/:action/:id'` — allows calling ANY controller action (Rails 3 pattern, banned in Rails 4+)
- `get '/:page', to: 'pages#show'` — wildcard route matching any path
- `namespace :admin` without auth constraint — admin routes public
- `mount SomeEngine => '/path'` — engine routes bypass main app middleware

**Callbacks:**
- `before_action` / `after_action` — skipped with `skip_before_action` in subclasses
- `around_action` — complex control flow; ensure auth checks aren't skippable
- `after_commit` — runs outside transaction; if it raises, data is already committed
