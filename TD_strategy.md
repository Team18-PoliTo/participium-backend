# The Strategy for Team 18

The primary goal for our team is **maintainability**.

After reviewing the SonarQube report, we plan to refactor our codebase to improve reliability, maintainability, and security across the projects.

To support this, we decided to integrate **typescript-eslint** for the back end and **JSLint** for the front end. These tools will help us enforce rules such as removing unused auto-generated code, cleaning up outdated imports, and adopting modern import formats so that we rely on built-in core modules rather than unnecessary packages from *node_modules*.

Since SonarQube generates reports only for the **main** branch, we will merge our changes into main more frequently to get updated reports and act on them quickly.

At the end of each sprint, we will review the current technical debt and decide which items should be included in the next sprint.

We will prioritize them by high impact first, then based on SonarQube bug reports, and after that handle lower-priority improvements when time allows.

We will split selected items into tasks and address them in the following sprint.
