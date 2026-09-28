---
name: syntax-checker
description: Ensures that you explicitly run linters or type checkers like flake8 or tsc before committing any code, so you do not introduce NameError, undefined variables, or syntax errors. Trigger this whenever making code changes, particularly Python and TypeScript.
---

# Syntax Checker Protocol
As an AI coding assistant, it is unacceptable to introduce trivial syntax errors (like missing imports, undefined variables, or simple typos) into the codebase. 

## Requirements
Before performing any `git commit` or considering a coding task "complete", you MUST:
1. **Run a static analysis tool** on the modified files or directories.
2. For Python code: Use `run_command` with `flake8 <file>` or `python -m flake8 .`. Pay special attention to `F821` (undefined name) which causes runtime crashes.
3. For TypeScript/React code: Use `run_command` with `npm run build` or `npx tsc --noEmit` in the frontend directory to catch undefined variables.
4. If any errors are found, you MUST fix them using `multi_replace_file_content` before proceeding.

## Mental Checklist
- Did I import everything I used (e.g., `Dict`, `List` from `typing`)?
- Did I misspell any variable names?
- Did I close all brackets and tags properly?
- **Did I actually run the linter?** (Do not skip this step!)
