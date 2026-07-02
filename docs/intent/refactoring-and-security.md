# Intent: Refactoring and Security Plan

## Confirmed Intent
- **Outcome**: A prioritized execution plan that starts with Architectural Refactoring (splitting the massive Rust and TypeScript monoliths) to build a clean foundation, followed sequentially by Security fixes, and leaving UX/UI polish for later.
- **User**: The developer (and any future maintainers), to make the codebase much easier, safer, and faster to work in long-term.
- **Why now**: Because optimizing for long-term health means doing the heavy structural lifting before patching vulnerabilities in a messy codebase.
- **Success**: We agree on a concrete, ordered roadmap starting with the `git.rs` / `git.ts` split, which sets us up to tackle the rest of the list safely.
- **Constraint**: The refactoring phase must be purely structural. We cannot change the app's behavior or try to sneak in feature changes while moving the code around.
- **Out of scope**: Actually writing the code or fixing the security vulnerabilities at the time of this plan's creation. We are solely aligning on the intent and the plan of attack.

## Execution Order
Based on the `todo.md` list, the prioritized order of operations is:
1. **Architectural Refactoring** (Starting with `src-tauri/src/git.rs` and `src/api/git.ts`)
2. **Security & Cybersecurity**
3. **State Management & Frontend Architecture**
4. **UX / UI & Styling Improvements**
5. **Testing & Quality**
