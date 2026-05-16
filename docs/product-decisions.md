# Product Decisions

## Payroll Export Removed

Payroll export is removed from the product scope.

The app should keep attendance reporting for admins, including Excel/CSV-style attendance reports if needed, but it should not calculate payroll, generate payroll-specific exports, or include payroll workflows.

Implications:

- Keep: attendance history, attendance reports, date/month filters, employee attendance summaries.
- Remove from future scope: payroll module, payroll export, salary payout export, finance processing workflows.
- Comp-off can still exist as an attendance/leave feature, but not as a payroll calculation feature.
