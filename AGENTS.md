# Repo Agent Instructions

First of all, 用户使用中文，请用中文书写文档

- Code should follow modular design principles as much as possible; different modules should avoid interfering with each other. Any experimental feature should place all its files within a single sub-module and must not generate junk files in larger modules.
- Before building new code, review existing code to reduce redundancy.
- Any new change should remain as simple as possible. Do not add extra branches or unauthorized feature planning.
- Business outcomes come first in any implementation. The top priority is delivering the required functionality, followed by long-term architecture planning, and then keeping the module style concise and efficient.
- Any new code is strictly forbidden from being stored in high-level modules (e.g., the repository root or other high-level module directories). It must be placed in a leaf module directory based on actual usage.
- docs/architecture/repository-structure.md is the repository architecture file. Before each code change, you must review this file to ensure the change follows the repository architecture. After modifications, update this file immediately to keep it consistent with the repository.

When explaining code to the user, always describe it from a business perspective. Even if the user is a developer, treat them as a management leader who only wants to know what the code can do for the business, its advantages, and its disadvantages.

Before performing any code changes, you must align your idea with the user. Only start work after the user confirms the idea is feasible.

Before any file deletion or rollback, you must create a backup.

Positive Prompts (standard operations, highly encouraged behaviors):

- After writing front-end code, self-check lint and run `npm run dev` to check for any errors. If there are errors, fix them until there are no error messages.
- Store development logs for each development cycle in `docs/dev_logs`, detailing which files were modified and what was done. Update `dev_logs` after every modification. The `dev_logs` documentation should ideally have database-like properties allowing for snapshot rollbacks. The storage format should use the development date as the folder name, with filenames inside representing the development content. Each file must display the specific changes, the files modified, and the modification time (precise to the second).
- Automatically update `repository-structure.md`.
- Automate everything that can be automated for the user instead of asking them to do it manually. (Prompt for necessary information if needed).
- Since your knowledge is likely outdated, when it comes to installing SDKs or Python package services, please obtain the latest version online and install it by default, instead of an outdated version number.

Negative Prompts (strictly prohibited behaviors):

- Writing code without any checks or autonomous tests, leading to many errors and bugs.
- Failing to write logs in `dev_logs` after completing development, resulting in loss of development history and difficulty in later maintenance.
- Failing to update the `repository-structure.md` document after developing new features.
- Being lazy and asking the user to manually perform tasks that you could complete via the command line or a script (Negative example: 'Once you (the user) complete XXX, I (the LLM) can do YYY'). This is strictly prohibited! If you cannot complete it independently, you must state that once you are provided with XXX information, you can then proceed with YYY.
- Installing an outdated SDK or package version, such as mathlib 4.26 or pytorch 2.7, etc. The latest versions have long exceeded these old versions, which would bring version issues to the user.
