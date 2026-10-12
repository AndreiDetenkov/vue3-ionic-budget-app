# Personal Budget Tracker

Tracks personal expenses organized by spending categories and summarizes them across time periods.

## Language

**Transaction**:
A single recorded expense with a title/description, a monetary amount, the timestamp it occurred, and the category it belongs to.
_Avoid_: Report, transaction item, item

**Category**:
A classification bucket for grouping expenses (such as Food, Housing, or Transportation), identified by a title and an icon.
_Avoid_: Group, tag

**Category Report**:
An aggregated summary of expenses for a single category over a selected date range, containing the total amount spent and the list of contributing transactions.
_Avoid_: Report (when referring to a raw transaction), transaction group

**Date Range**:
A closed time interval bounded by start (`from`) and end (`to`) timestamps used to filter transactions and compute category reports.
_Avoid_: Range interface, filter unit
