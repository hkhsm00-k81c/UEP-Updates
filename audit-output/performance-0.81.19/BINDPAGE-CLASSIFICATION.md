# bindPage performance classification

- total bindings: 270
- one-time candidates: 9
- dynamic keep/delegate: 208
- already guarded: 2
- review: 51
- duplicate target/event groups: 9

## One-time candidates
- L107 click #settingsDiagnosticsButton
- L108 click #settingsInfoButton
- L207 click #fiveGradeApply
- L208 keydown #fiveGradeEnrollment
- L255 click #officialAttendanceAdd
- L259 click #lateAttendanceAdd
- L274 click #scoreQueryButton
- L291 click #admissionQueryButton
- L388 click #dutyReset

## Duplicate groups
- 13x (x) => (x::click lines 447, 456, 553, 556, 559, 586, 599, 621, 624, 630, 633, 636, 639
- 7x button::click lines 135, 170, 173, 178, 192, 195, 213
- 5x (x::click lines 441, 485, 605, 643, 652
- 3x if (input) input::input lines 230, 380, 784
- 2x [data-curriculum-error-only]::click lines 9, 298
- 2x $$('[data-student-admission-badge]').forEach(button=>button::click lines 25, 90
- 2x if(classSelect)classSelect::change lines 271, 287
- 2x if(studentSelect)studentSelect::change lines 272, 288
- 2x if(scope)scope::change lines 273, 289
