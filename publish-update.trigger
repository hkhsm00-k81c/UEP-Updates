Publish requested: UEP 0.81.06 final operational workflow
Requested at: 2026-08-21 KST
Selection source: renamed wide 06_선택과목이력 only; 260 active students.
Curriculum: student application includes errors and correction SMS; subject workflow is semester cards then subject cards then protected roster.
Subjects: all 2-1, 2-2, 3-1, 3-2 courses; applicants, expected sections, closure/crowding state; grade/class sorting; dorm badge; privacy mode.
SDGs: actual evidence from activities, volunteering, programs, reports, subjects and career; supplementation at page bottom; UEP student picker.
Recordcheck: class and subject filters, errors only, confirm/dismiss, printable/PDF report.
Distribution: GitHub automatic updater only; no original ZIP distribution to teachers.
Security: no experimental readonly gateway or embedded secrets.
Build script: scripts/build-update-0.81.06.ps1
Visible version: v0.81.06

Retry: line-ending-safe removal of legacy 06A range.

Retry 2: rebuild canonical selection range map.

Retry 3: align release verification with canonical A1:AI1000 wide-row source; require legacy 06A absence.

Publish requested: UEP 0.81.07 refinement
Requested at: 2026-08-21 KST
Scope: SDGs evidence consolidation; curriculum query/order/error highlighting/four-term layout/expected grade; NEIS merged-cell identity parsing and editable validation rules.

Retry 0.81.07: corrected regex verification literal.

Publish requested: UEP 0.81.08 operations and NEIS parser
Requested at: 2026-08-22 KST
Scope: teacher dorm-outing save; grouped supervisor report/email; official attendance detail and periods; homeroom counseling student cards; fixed-layout NEIS merged-cell parser and individual filter.

Publish requested: UEP 0.81.09 startup recovery
Requested at: 2026-08-22 KST
Scope: remove the v0.81.08 dashboard startup override while retaining dorm save, supervisor report/email and fixed-layout NEIS parsing.

Publish requested: UEP 0.81.10 selection compatibility recovery
Requested: 2026-08-22
Scope: remove the stale selectionView startup reference and route legacy selection navigation to the integrated curriculum view.

Publish requested: UEP 0.81.11 integrated view registry recovery
Requested: 2026-08-22
Scope: remove all stale standalone selection and SDGs view references, retain safe standalone record validation.

Publish requested: UEP 0.81.12 curriculum SDGs recordcheck interaction recovery
Requested: 2026-08-22
Scope: restore integrated records interactions and standalone NEIS record validation mount.

Publish requested: UEP 0.81.13 integrated recovery
Requested: 2026-08-22
Scope: restore canonical records/SDGs/recordcheck wiring, remove document-wide DOM observer and full-section scan, memoize selection analysis, and keep 06_선택과목이력 as the only selection source.

Retry UEP 0.81.13 after hardened observer/section-scan cleanup.
Retry UEP 0.81.13 after correcting integrated curriculum/SDGs verification names.
Retry UEP 0.81.13 from current main after verification-fix commit.
Retry UEP 0.81.13 after restoring canonical 0.81.06 curriculum and SDGs bodies.
Retry UEP 0.81.13 after fixing final release gates to canonical 0.81.06 view functions.
