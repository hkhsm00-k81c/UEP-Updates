# UEP 0.81.13 screen recovery registry

Expected canonical routes after recovery:

- dashboard -> dashboardView
- students -> studentsView
- records -> recordsView
  - activities -> existing records activities body
  - sdgs -> current records SDGs body + uepSdgsEvidenceBridge
  - curriculum -> uepCurriculumFinalView
  - final -> existing records final body
- recordcheck -> standaloneRecordcheckMount + window.uepMountRecordbookValidator

Obsolete compatibility routes to eliminate from the final flattened implementation:
- selectionView as a standalone navigation target
- sdgsView as a standalone navigation target
- selection: recordsView compatibility registry entry
- sdgs: recordsView compatibility registry entry
- 0.81.09-0.81.12 recovery-only fallbacks once canonical records wiring is verified

Button/event audit should confirm one handler path per visible control and no document-wide rebinding observer.
