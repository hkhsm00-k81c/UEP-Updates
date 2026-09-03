UEP 0.82.12 native dashboard renderer release
Base: v0.82.11
Remove: 0.82.10/0.82.11 dashboard DOM post-processing
Render: native five cards and native three-panel school work dashboard
Retry: CRLF-safe embedded renderer extraction
Retry: validate generated admission cards by native card definitions
Hotfix: v0.82.13 preserve $$ multi-selector bindings in String.replace callback
Retry: negative-lookbehind validation for standalone selector
Release: v0.82.14 native official attendance ledger card
Release: v0.82.15 bundled 2028 admissions education comparison data
Release: v0.82.16 one-time changelog popup and four status summary cards in one row
Retry: v0.82.16 release-note validation anchor fix
Hotfix: v0.82.17 local-first login recovery for School Read API 404
Recovery: v0.82.18 rebuild from last known good v0.82.14 base; keep popup + four status cards only
Release: v0.82.19 connect admissions live sheets 52/53/53A/53B/54/55/56 on stable v0.82.18
Inspect: exact School Read batch-read hook for v0.82.19 retry
Inspect retry: registered workflow route
Build retry: corrected actual 0.82.18 entries and 53B renderer mapping
Build retry 2: whitespace-tolerant 53/53A/53B anchors
Build retry 3: insert 53A/53B in electron main.cjs, renderer mapping in gyomuon.js
Inspect: v0.82.19 parser to renderer live admissions data flow
Inspect: parser-only output for real sheet-to-cache mapping
Inspect: exact parser-to-readonlyCache admissions handoff
Inspect retry: literal Contains matching
Release: v0.82.20 real admissions cache handoff and sheet-driven renderer
Release: v0.82.21 admissions UI readability + back navigation + version badge + automatic changelog popup
Release: v0.82.22 types 3-column layout + unified university detail + route back + updater version arrow + reliable changelog popup
Release: v0.82.23 wide admissions dialogs + region/prev-next university explorer + enriched admissions basics
Release: v0.82.24 basics auto-grid + quick badges + three-level university navigation + admission source state reset
Retry: v0.82.24 relax exact renderer validation anchor
Release: v0.82.25 university detail 3 cards = exact grade calculation / minimum by major / recommended courses; connect 57_내신산정DB
Release: v0.82.26 UEP common 5-grade and actual-9 grade averages use course-credit weighted mean; university conversion remains separate
Release: v0.82.27 use 18_학교교육과정DB 이수단위 as authoritative weights; 50_내신DB actual course records; cross-semester subjects match by course name
Retry: v0.82.27 route release trigger to actual Build and Release workflow
Retry 2: v0.82.27 move curriculum matrix handoff to electron main cache and use readonlyCache in renderer
Release: v0.82.28 fix score recent-semester card and common score statistics/print averages to use curriculum-credit weighting
Release: v0.82.29 fix combined individual and student dashboard remaining simple-average paths; all common internal averages use curriculum-credit weighting
Release: v0.82.30 final admissions graph 53→53A→53B→54 and 56→53B/54/57; use new U001-U068 order and university+campus joins
Inspect: v0.82.30 afterschool monthly session cards and dashboard today-program filtering
Inspect 2: v0.82.30 exact 11/12/13 parser-to-readonlyCache mapping for future sessions
Inspect 3: v0.82.30 locate all 12_차시일정 read-path source code before v0.82.31 patch
Release: v0.82.31 show planned afterschool sessions before class date and expose today's scheduled afterschool sessions on dashboard
Retry: v0.82.31 whitespace-tolerant actual/planned session parser anchors
Release: v0.82.32 rebuild admission understanding from actual 53B university tracks; show university + real track name and link back to university detail
Hotfix: v0.82.33 force track-first renderer at runtime and repair dashboard today-university click
Hardfix: v0.82.34 detect today-university card regardless of div/span/button DOM and rebind after rerender
Repair: v0.82.35 neutralize broad today-university capture matcher; restore basics/types clicks and direct-bind today university only
Inspect: native admissions top-card markup and click bindings from v0.82.33 before clean rebuild
Release: v0.82.36 clean rebuild from v0.82.33; one native data-dashboard-admission router for basics/types/university; no observer/text hacks
