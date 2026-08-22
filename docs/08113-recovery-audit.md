# UEP 0.81.13 recovery audit

Candidate-only recovery. Do not publish or update uep-policy.json until validation passes.

## Confirmed risk areas from 0.81.02-0.81.12
- document-wide MutationObserver added by 0.81.02
- repeated recordsView wrappers across 0.81.05, 0.81.06 and 0.81.07
- repeated uepSelectionDataset / bindSelectionAnalysis implementations
- records page full rerender on most curriculum controls
- repeated whole-array filters for student errors, class counts and score averages
- recordcheck list rebuilt with innerHTML on every decision/filter
- compatibility patches 0.81.09-0.81.12 masking removed/renamed view symbols

## Recovery gates
1. Renderer/main/data syntax pass.
2. 06_선택과목이력 is the only selection source; no 06A source remains.
3. Curriculum, SDGs and recordcheck body/mount functions exist.
4. No document-wide MutationObserver.
5. No SDGs full-document section scan microtask.
6. Selection dataset memoized between source-cache changes.
7. Automatic publish policy remains unchanged.
8. Risk counts are printed by candidate CI before any merge decision.

## Follow-up after screen recovery
After functional recovery, audit the rest of UEP for duplicate event registration, repeated full renders, global observers/timers, repeated data normalization, uncached derived datasets, synchronous heavy loops, and stale compatibility/fallback paths.
