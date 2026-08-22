# UEP 0.81.13 performance follow-up

After screen recovery is stable, inspect the entire renderer and main process for:

- duplicate function declarations and late function reassignment
- nested wrapper chains around page renderers
- addEventListener/onclick duplication for the same controls
- MutationObserver scope and lifecycle
- recurring setTimeout/setInterval/requestAnimationFrame/queueMicrotask hooks
- full-page render calls from local control changes
- repeated map/filter/sort over readonlyCache arrays during one render
- derived-data recomputation without cache invalidation
- synchronous local Excel/CSV processing on UI paths
- repeated Google read/fetch requests caused by navigation or local filters
- redundant CSS selectors and compatibility styles attached to removed screens
- obsolete feature markers, fallback symbols and recovery-only branches

Optimization preference:
1. remove obsolete code before micro-optimizing;
2. keep one canonical renderer per screen;
3. cache derived datasets by source-reference/version;
4. update the smallest DOM region necessary;
5. bind event behavior once per mount or via scoped event delegation;
6. explicitly dispose observers/timers/listeners when a screen unmounts.
