# Project Learnings and Guidelines

## Environment - Windows PowerShell
- Always use PowerShell syntax (e.g., `;` for command chaining, `Test-Path` for file checks).
- Avoid `grep`, use `Select-String` if necessary, but prefer direct tool outputs.
- Large command outputs are truncated; redirect to files and search them if needed, but be mindful of the display limit.
- **Cleanup**: Always delete temporary files (like `test_output.txt`) created during execution to keep the workspace clean.

## Java 25 / Spring Boot 3.4
- Use `MockitoBean` instead of `MockBean` as it is deprecated in Spring Boot 3.4+.
- **JaCoCo**: Use 0.8.14+ for official Java 25 support (0.8.12 fails with `Unsupported class file major version 69`).
- **Spring Boot**: Use 3.4.13+ (or 3.5.x) for Java 25 — earlier 3.4.0 ships an older ASM that fails to parse Java 25 class files with `Incompatible class format` / `ClassFormatException`.
- **Lombok**: Use 1.18.42+ for JDK 25.0.1 (older versions fail with `ExceptionInInitializerError: com.sun.tools.javac.code.TypeTag :: UNKNOWN`). Mandatory: declare Lombok as an `annotationProcessorPath` in `maven-compiler-plugin` (required since JDK 23). Exclude Lombok from the Spring Boot fat jar via `spring-boot-maven-plugin` `<excludes>`.
- **Byte Buddy**: Mockito on JDK 25 requires Byte Buddy 1.17.8+ to mock interfaces/classes (class file v69). Pin `net.bytebuddy:byte-buddy` and `byte-buddy-agent` at 1.17.8 (test scope) to override Spring Boot's transitive version.
- Implicitly declared classes/IO features might cause issues; stick to standard Java unless specifically asked.

## Testing Strategy
- To reach high code coverage (>90%):
    - Use `MockMvc` for controller testing to cover endpoints and security filters.
    - Use `@TempDir` for service tests involving file I/O.
    - Test both success and error paths (e.g., `Optional.orElseThrow()`).
    - Audit all branches (if/else) in services and controllers.

## Frontend Testing (React)
- Use Jest + React Testing Library (bundled with `react-scripts`).
- Place test files alongside components as `*.test.js`; a global `src/setupTests.js` imports `@testing-library/jest-dom`.
- Mock `axios` with `jest.mock('axios')` to avoid hitting the backend.
- Use `jest.useFakeTimers()` + `jest.advanceTimersByTime(ms)` (wrapped in `act`) for `setInterval`-driven components like the projector slideshow.
- Run once with `npm test` (configured with `--watchAll=false`); use `npm run test:watch` for interactive mode.
- Note: Node.js/npm are NOT installed in the agent environment — frontend tests must be executed by the user locally or inside the frontend Docker image.

## Known Issues
- None at the moment.
