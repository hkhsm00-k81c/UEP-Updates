# UEP CSS CLEANUP PHASE 1

- chars before: 40019
- chars after: 39530
- chars removed: 489
- declarations removed as later-dominated: 25
- empty duplicate rules removed: 3

## Target results
- .input-method-row: rules 3 -> 3; declarations pruned=5
- .input-method-row>b: rules 3 -> 3; declarations pruned=1
- .input-method-row button: rules 2 -> 1; declarations pruned=7
- .input-method-row button.active: rules 2 -> 1; declarations pruned=4
- .input-center-compact-setup: rules 2 -> 2; declarations pruned=3
- .input-center-compact-setup label: rules 3 -> 3; declarations pruned=3
- .input-center-compact-setup label.grow: rules 3 -> 2; declarations pruned=2

## Safety
- Only declarations dominated by a later identical selector were removed.
- Earlier-only declarations remain at their original cascade position.
- !important precedence is preserved.
- Effective declaration map for every target selector is asserted identical before/after.