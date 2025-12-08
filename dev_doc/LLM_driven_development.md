---
title: "LLM-Driven Development Workflow Guide"
output:
  html_document:
    toc: true
    toc_depth: 3 # Adjust this to include headers up to a specific level
    toc_float: true # Makes the TOC float on the side
---


This guide defines a **general, reusable workflow** for developing any **client-side interactive web application** using:

- ChatGPT (or other LLM) as the *design and planning assistant*
- Codex (or other code-generation LLM) as the *implementation engine*

Because this guide contains prompts intended for LLM consumption, the *entire document must be delivered as raw Markdown inside this fenced block*.

All content inside this block is **raw text**. Nothing should be rendered to HTML by the ChatGPT UI.


---

# 0. Functional Description Phase (Phase 0)

Phase 0 exists to generate or refine a **functional description** of the application before requirements are drafted.

Depending on the project’s state, Phase 0 has **three distinct contexts**:

## 0A. Brand-new application
The human developer has no app yet. ChatGPT conducts **iterative elicitation**:

- What is the domain/purpose?
- What workflows does the app support?
- What UI components or interactions are needed?
- What data does the app manipulate?

Output: a *clean functional description* of the intended app.

## 0B. Existing application **without** a functional description
The human uploads current code (HTML/JS/CSS/other source files).  
ChatGPT analyzes the code and produces a *functional description of what the app currently does*.

This description should:

- Avoid implementation details
- Focus on *what* the app does, not *how*
- Describe UI elements, controls, behaviors, interactions, output formats

## 0C. Existing application **with** a stored functional description
The human simply uploads the stored description.  
No code upload is needed for Phase 0.

## Purpose of Phase 0 output
The output of Phase 0 will be:

- Provided to Phase 1 (Requirements Elicitation)  
- Stored in the codebase (e.g., a `docs/functional_description.md` file) at the end of the cycle  
- Used in future cycles to avoid repeatedly uploading code  

## Phase 0 Prompt Template
The human says:

**“Phase 0: Produce a functional description of this app. I am providing:
(choose one)
— A description of a brand-new app  
— Existing code files  
— A previously generated functional description  
Generate a clean, implementation-free description of what the app does.”**

ChatGPT returns a *functional description only*.  
No plan, no milestones, no implementation details.


---

# 1. Requirements Elicitation (Phase 1)

In Phase 1, the human provides:

- The functional description from Phase 0
- New goals, problems, feature requests
- Constraints, preferences, UX goals
- The *current version number* (e.g., `1.16.0`)

ChatGPT refines these into a **precise and complete requirements list**.

## Rules for Phase 1

- No code should be analyzed yet.
- ChatGPT may ask clarifying questions.
- ChatGPT must not propose implementation details.
- Requirements must not mix conceptual design with technical details.

## Phase 1 Prompt Template
Human says:

**“Phase 1: Using the functional description and my inputs, help me refine a complete and precise
requirements list for the next version. Ask clarification questions where needed. Do NOT propose
an implementation plan yet.”**

When complete, the human explicitly instructs:

**“Finalize the requirements list.”**

ChatGPT returns the polished list.


---

# 2. Roadmap Planning (Phase 2)

ChatGPT uses the finalized requirements list to produce a **versioned roadmap** containing:

- Guiding principles  
- Major milestones (feature-level steps)  
- Micro-milestones (fine-grained corrective/repair steps) generated later as needed  
- Detailed implementation descriptions  
- Codex prompts for each milestone  

## Versioning Rules

- The human provides the starting version number, e.g., `1.16.0`.  
- The first milestone is `1.16.1`.  
- Micro-milestones append another decimal: `1.16.1.1`, `1.16.1.2`, etc.  
- Milestone names must be **descriptive**, not symbolic.  
- Codex should embed version numbers in code comments for traceability.  
- The human uses git for commits, not Codex.  

Recommended git commands (human only):

```
git add .
git commit -m "Implement milestone v1.16.X — <description>"
```

## Where the code is uploaded
ChatGPT needs the code in **Phase 3**, not Phase 2.  
Roadmap planning should not rely on code inspection.

## Refactoring consideration
ChatGPT should:

- Defer code inspection to Phase 3  
- After seeing code, propose internal refactorings as separate milestones  
- Renumber milestones accordingly once refactors are known  

## Roadmap Formatting Rules

- Entire roadmap delivered as raw Markdown inside a fenced text block  
- No rendered HTML allowed  
- Includes:  
  - Full milestone descriptions  
  - Full Codex prompts  
  - Warnings not to modify unrelated code  
  - Explicit file lists to modify  
  - Testing instructions directed to the human, not Codex  

## Phase 2 Prompt Template
Human says:

**“Phase 2: Using the finalized requirements list and the functional description, produce a complete roadmap with milestones and Codex prompts. Deliver the entire roadmap as raw Markdown in a fenced text block.”**

ChatGPT outputs the roadmap.


---

# 3. Code Analysis & Refactoring Planning (Phase 3)

Now the human uploads the *current codebase*.

ChatGPT:

- Reads the actual HTML/JS/CSS/assets  
- Identifies architectural structure  
- Detects inconsistencies between requirements and code  
- Suggests refactoring steps as *new milestones* (e.g., `1.16.1–1.16.3`)  

## Why the code is uploaded again

LLMs do not maintain full state across long conversations.

This guide explicitly requires:

- Code uploaded **before Phase 0 only for extraction**, not retained  
- Code uploaded again in **Phase 3 for full analysis**  

This avoids hallucinations, lost context, and outdated assumptions.

## Good refactoring milestone properties

- Purely structural (no feature changes)  
- Safe, testable atomic changes  
- No redesign beyond scope  
- Eliminate duplication, dead code, layout inconsistencies  
- Restructure state, config, or component boundaries as required  

## Phase 3 Prompt Template
Human says:

**“Phase 3: Here is the current codebase. Analyze it against the roadmap and requirements, identify needed refactoring milestones, and insert them into the roadmap before feature milestones. Do not begin implementation yet.”**

ChatGPT replies with added refactor milestones.


---

# 4. Implementation (Phase 4)

Now the human proceeds through milestones sequentially.

For each milestone:

1. Human copies the milestone’s Codex prompt  
2. Human opens a new Codex session  
3. Provides:  
   - The milestone version number  
   - The codebase (Codex reads files directly in the local dev directory)  
4. Codex makes the modifications  
5. Human tests (manual unless automated tests exist)  
6. Human commits via git  

If Codex cannot complete a milestone in one attempt, ChatGPT must generate **micro-milestones**.

## When to create micro-milestones

- Codex refuses the request  
- Codex reports the task is too large or risky  
- Codex makes partial modifications  
- Human sees regressions (often in browser console)  

Micro-milestones should fix:

- Naming inconsistencies  
- Layout issues  
- Missing tooltips  
- Incorrect schema fields  
- Broken legend toggles  
- Overflow problems  
- Misaligned UI components  

## Phase 4 Prompt Template
Human says:

**“Codex could not complete milestone vX.Y.Z. Here is the error information (including console messages). Please analyze the failure and generate micro-milestones vX.Y.Z.1, vX.Y.Z.2, … until the milestone can be safely completed.”**

ChatGPT replies with atomic micro-milestones.


---

# 5. Finalization (Phase 5)

When all milestones and micro-milestones are implemented:

- Human tests the app  
- Human tags the release in git  
- ChatGPT generates the Phase 0 functional description for the *next* development cycle  
- This is stored inside the codebase, e.g., `docs/functional_description.md`  

## Phase 5 Prompt Template
Human says:

**“Phase 5: Generate a fresh functional description of the app, suitable for use as Phase 0 in the next cycle. Exclude implementation details.”**

ChatGPT replies with the description.


---

# Appendix A — ChatGPT Prompt Templates

## Template: Phase 0 (Existing App, No Description)

```
Phase 0: Produce a clean, implementation-free functional description of this app.
I am uploading the current codebase.
Describe:

- All UI components
- All interactions
- All input/output behavior
- Any internal conceptual models

Do NOT propose improvements or plans.
Do NOT include implementation details.
```

## Template: Phase 1 Requirements

```
Phase 1: Using the functional description and my notes, help me refine a complete,
precise requirements list for the next version.

Ask clarification questions when needed.
Do NOT propose implementation details.
```

## Template: Phase 2 Roadmap

```
Phase 2: Produce a full roadmap with numbered milestones starting from version V.
Include:

- Guiding principles
- Major milestones with descriptive names
- Detailed milestone descriptions
- Detailed Codex prompts
- Instructions not to modify unrelated code
- Human testing steps

Deliver the roadmap as RAW MARKDOWN in a fenced block.
```

## Template: Phase 3 Refactoring

```
Phase 3: Analyze the uploaded code. Identify structural refactors needed to support
the roadmap. Insert refactor milestones before feature milestones. Do NOT make
changes—only update the roadmap.
```

## Template: Micro-Milestones

```
Codex could not complete milestone vX.Y.Z. Please analyze the failure and produce
micro-milestones vX.Y.Z.1, vX.Y.Z.2, … that break the task into safe atomic steps.
Each must include a Codex prompt.
```


---

# Appendix B — Best Practices for Client-Side Web Apps

## Configuration

- All UI strings should live in an external configuration file.
- Any UI text rendered in multiple places should be centralized.

## Architecture

- Separate logic, rendering, and data handling modules.
- Do not mix DOM construction and business logic.
- Use clear namespaces for shared libraries.
- Avoid global variables except for a documented app-state store.

## Layout and UX

- Ensure responsive design without magic numbers.
- Use semantic HTML where possible.
- Keep interactive components discoverable.
- Provide tooltips instead of inline text.

## Testing

- Automated tests (if any) must be runnable by Codex.
- Manual tests must be listed explicitly for the human.

## Versioning

- Embed version numbers in code comments for traceability.
- Tag git releases consistently.


---

# End of Document