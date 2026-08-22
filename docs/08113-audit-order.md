# Audit execution order

1. Reconstruct shipped app from v0.81.01 plus update chain.
2. Apply 0.81.13 recovery cleanup.
3. Verify page registry and records internal modes.
4. Verify recordcheck mount lifecycle.
5. Remove global observer/full-section scan.
6. Measure duplicate renderer/binder declarations and render(records) call count.
7. Restore broken UI connections before any further feature changes.
8. Only after recovery, continue whole-code duplicate/performance audit.
