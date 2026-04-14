# Spring / Spring Boot — Security Checks

> Parent: `java.md` — always load parent first.

## Framework-Specific Vulnerabilities

**Spring Expression Language (SpEL) Injection:**
- `@Value("#{${user_input}}")` — SpEL in `@Value` annotation → RCE
- `ExpressionParser.parseExpression(user_input).getValue()` — direct SpEL evaluation → RCE
- `@PreAuthorize("hasRole('" + userInput + "')")` — SpEL injection in security annotations
- `@Cacheable(key = "#" + userInput)` — SpEL in cache key
- Thymeleaf SpEL: `th:text="${user_input}"` if user controls attribute value → SSTI → RCE
- `StandardEvaluationContext` allows access to all Java classes; use `SimpleEvaluationContext` instead
- Spring Cloud Function SpEL injection (CVE-2022-22963 pattern)

**Actuator Exposure:**
- `/actuator/env` — exposes all environment variables including secrets, API keys, DB passwords
- `/actuator/heapdump` — full JVM heap dump → extract credentials, session tokens, PII
- `/actuator/configprops` — all configuration properties
- `/actuator/mappings` — all URL endpoints → API enumeration
- `/actuator/beans` — all Spring beans → internal architecture disclosure
- `/actuator/loggers` — can be used to change log levels (POST) → suppress audit logs
- `/actuator/shutdown` — (if enabled) remote application shutdown → DoS
- `/actuator/jolokia` — JMX access → RCE via MBean manipulation
- Missing: `management.endpoints.web.exposure.include` should be minimal, not `*`
- Missing: `management.server.port` should be different from application port
- Missing: actuator endpoints should require authentication

**Authentication & Spring Security:**
- `.permitAll()` on sensitive endpoints — no auth required
- `.csrf().disable()` — CSRF protection disabled (common in API projects but risky for cookie-based auth)
- `http.authorizeRequests()` vs `http.authorizeHttpRequests()` — old API has path matching inconsistencies
- `antMatchers("/admin/**")` vs `mvcMatchers("/admin/**")` — different path matching semantics, `ant` can miss trailing slashes
- Method-level security (`@PreAuthorize`) without `@EnableMethodSecurity` — annotations silently ignored
- `@Secured("ROLE_ADMIN")` vs `@PreAuthorize("hasRole('ADMIN')")` — `ROLE_` prefix inconsistency
- `SecurityContextHolder.getContext().getAuthentication()` returning `AnonymousAuthenticationToken` — not null-checked
- `BCryptPasswordEncoder` with low strength (< 10 rounds)
- `NoOpPasswordEncoder` — stores plaintext passwords (deprecated but used in tutorials)
- Missing `X-Content-Type-Options`, `X-Frame-Options`, `Strict-Transport-Security` headers (Spring Security adds some by default but customization can remove them)

**Data Binding & Mass Assignment:**
- `@ModelAttribute` binds ALL request parameters to object fields — mass assignment
- `@RequestBody` with Jackson deserializes all fields unless `@JsonIgnore` / `@JsonProperty(access = READ_ONLY)`
- `WebDataBinder.setAllowedFields()` or `setDisallowedFields()` — but denylist approach is fragile
- Spring Data REST auto-exposes repositories at `/api/entities` — all CRUD operations public by default
- PATCH operations updating fields that should be immutable (e.g., `role`, `id`, `createdAt`)
- `@InitBinder` not set — no field restrictions on form binding

**SQL & Data Access:**
- `@Query("SELECT u FROM User u WHERE u.name = '" + name + "'")` — JPQL injection
- `@Query(value = "SELECT * FROM users WHERE name = ?", nativeQuery = true)` with string concat — native SQL injection
- `JdbcTemplate.query("SELECT ... " + userInput)` — SQL injection
- `EntityManager.createNativeQuery(userInput)` — raw SQL
- `Specification` with user-controlled predicates — criteria API injection
- `@Query` with SpEL: `@Query("SELECT u FROM User u WHERE u.name = :#{#name}")` — SpEL in query
- Spring Data JPA derived queries: `findByNameContaining(userInput)` — safe (parameterized) but LIKE injection for DoS (`%%%%%`)

**File Operations:**
- `ResourceUtils.getFile(userInput)` — arbitrary file read via `file:`, `classpath:`, `url:` prefixes
- `ClassPathResource(userInput)` — classpath traversal
- `MultipartFile.transferTo(new File(userPath))` — file upload path traversal
- `MultipartFile.getOriginalFilename()` used directly — attacker-controlled filename
- `ResourceLoader.getResource(userInput)` — SSRF via `http://` URL scheme
- Missing multipart upload size limits: `spring.servlet.multipart.max-file-size` / `max-request-size`

**Deserialization:**
- Spring RMI endpoints — Java deserialization → RCE
- `ObjectInputStream` in custom `HttpMessageConverter`
- `@RequestBody` with XML and Jackson XML or JAXB — XXE if external entities not disabled
- `SerializationUtils.deserialize(bytes)` — Java native deserialization
- Redis session serialization with Java serializer — deserialization on session load
- Spring AMQP / JMS with Java object message type — deserialization from message queue

**Error Handling & Information Disclosure:**
- `server.error.include-stacktrace=always` — stack traces in HTTP responses
- `server.error.include-message=always` — internal error messages exposed
- `@ExceptionHandler` returning `e.getMessage()` — raw exception text
- Whitelabel error page enabled — Spring boot default error page with details
- `spring.jpa.show-sql=true` — SQL queries logged including parameters

**Configuration:**
- `spring.datasource.password` in `application.properties` committed to git
- `spring.mail.password` in config files
- `server.ssl.key-store-password` in config
- `spring.profiles.active` set to `dev` in production — different security settings
- `SPRING_APPLICATION_JSON` environment variable — can override any config property
- `spring.config.import` loading configs from external/attacker-controlled URLs
- `logging.level.org.springframework.security=DEBUG` — security decisions logged in detail

**CORS:**
- `@CrossOrigin(origins = "*")` — allows all origins
- `@CrossOrigin` without origins — defaults to all origins
- `CorsConfiguration.addAllowedOrigin("*")` with `setAllowCredentials(true)` — credential theft
- Missing `allowedMethods` restriction — all HTTP methods permitted

## Threat Scan Patterns

**Suspicious Spring patterns:**
- Custom `BeanPostProcessor` that modifies security beans — backdoor injection
- `@EventListener` or `ApplicationListener` phoning home on startup
- Custom `Filter` / `HandlerInterceptor` that exfiltrates request data
- `CommandLineRunner` / `ApplicationRunner` executing arbitrary code at startup
- `@Scheduled` tasks running suspicious operations
- Custom `AuthenticationProvider` that always returns success for certain credentials — admin backdoor
- `EnvironmentPostProcessor` that loads remote configuration — remote code injection
- Spring Cloud Config server pointed at attacker-controlled git repo
