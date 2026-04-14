# Ruby — Security Checks

> Also load framework-specific files when detected:
> - Rails → `frameworks/rails.md`

## Code Vulnerabilities (OWASP)

**Injection & Code Execution:**
- `eval(user_input)` — arbitrary code execution
- `send(user_input, ...)` / `public_send(user_input, ...)` — calls arbitrary methods
- `Object.const_get(user_input)` — instantiate arbitrary classes
- `instance_variable_set("@#{user_input}", value)` — set arbitrary instance vars
- `system(user_input)` / `exec(user_input)` / `` `#{user_input}` `` — command injection
- `%x{#{user_input}}` — command injection via percent-literal
- `IO.popen(user_input)` / `Open3.capture3(user_input)` — shell execution
- `Kernel.open(user_input)` — if input starts with `|`, executes as command (use `File.open` or `URI.open`)
- `ERB.new(user_input).result` — template injection → code execution
- `Binding` objects leaked to user context (full access to scope variables)

**Deserialization:**
- `Marshal.load(untrusted_data)` — arbitrary object instantiation → RCE. Never use with untrusted input
- `YAML.load(untrusted_data)` — can instantiate arbitrary objects. Use `YAML.safe_load()`
- `Psych.load(untrusted, permitted_classes: [...])` — allowlist needed if not using safe_load
- `JSON.parse(untrusted_data, create_additions: true)` — object creation via `json_class` key. Use `create_additions: false` (default since Ruby 2.x)

**SQL Injection:**
- String interpolation in ActiveRecord: `User.where("name = '#{params[:name]}'")`
- `find_by_sql("SELECT ... #{params[:id]}")` — raw SQL with interpolation
- `.order(params[:sort])` — SQL injection via ORDER BY clause
- `.pluck(params[:col])` — column name injection
- `.group(params[:field])` — GROUP BY injection
- `.select(params[:fields])` — SELECT clause injection
- Use parameterized: `User.where("name = ?", params[:name])` or `User.where(name: params[:name])`

**XSS:**
- `raw(user_input)` in ERB — bypasses HTML escaping
- `html_safe` on user input — marks string as safe, skipping escaping
- `content_tag(:div, user_input.html_safe)` — XSS via html_safe
- `<%= user_input %>` is auto-escaped in Rails 3+, but `<%== user_input %>` is raw
- `link_to("click", "javascript:#{user_input}")` — protocol XSS
- `render inline: user_input` — template injection

**Mass Assignment:**
- Missing `strong_parameters` — use `params.require(:user).permit(:name, :email)`
- `params.permit!` — permits everything (defeats the purpose)
- `User.new(params)` without permit — mass assignment (pre-Rails 4 pattern)
- `update_attributes(params)` without permit
- `attr_accessible` missing in Rails 3 models

**Authentication & Crypto:**
- `Digest::MD5.hexdigest(password)` / `Digest::SHA1` — use `BCrypt::Password.create()`
- `SecureRandom.random_number` — fine, but verify it's used for tokens (not `rand()`)
- `rand()` for security tokens — predictable. Use `SecureRandom.hex` or `SecureRandom.urlsafe_base64`
- `==` for token comparison — timing attack. Use `Rack::Utils.secure_compare()` or `ActiveSupport::SecurityUtils.secure_compare()`
- `cookies[:token]` without `secure: true, httponly: true, same_site: :strict`
- `session[:user_id]` without session fixation protection (reset_session after login)

**File Operations:**
- `File.read(params[:path])` — path traversal
- `send_file(params[:file])` — arbitrary file download
- `File.open(user_input)` — can also execute commands if Kernel.open is aliased
- `Tempfile` without proper cleanup — temp file races
- `FileUtils.cp(user_input, dest)` / `FileUtils.mv` — path traversal
- Missing `File.expand_path` + prefix validation for path containment

**Regex:**
- Ruby regex `//` without `\A` and `\z` anchors — `^` and `$` match line boundaries in Ruby, not string boundaries
- `Regexp.new(user_input)` — ReDoS via user-controlled regex
- `/^https?:\/\//` actually matches `javascript:fake\nhttp://` due to multiline `^`

**Configuration:**
- `config.consider_all_requests_local = true` in production — detailed errors to all users
- `config.force_ssl = false` — no HTTPS enforcement
- `config.action_dispatch.default_headers` missing security headers
- `protect_from_forgery` missing or `with: :null_session` on non-API controllers
- Gemfile with `gem 'pry'` or `gem 'byebug'` in production group

## Threat Scan Patterns

**Suspicious Patterns:**
- `ObjectSpace.each_object` — enumerate all objects in memory
- `BasicObject.__send__` — bypass method visibility
- `TracePoint` — hook into method calls/returns (debugger/monitor)
- `Fiddle` / `DL` — FFI to C (native code execution)
- `RubyVM::InstructionSequence` — bytecode manipulation
- `method(:exit)` / `method(:system)` stored in variables — deferred dangerous calls
- `define_method` with user-controlled name/body — runtime method injection
- `require` with computed paths — dynamic module loading
- `.so` / `.bundle` files alongside Ruby code — native extensions to audit
- `Gem::Specification` / `Gemfile` with `git:` sources pointing to unusual repos
- `Rake` tasks that download/execute external scripts
- Monkey-patching core classes (`String`, `Hash`, `Array`) — can alter security behavior globally
