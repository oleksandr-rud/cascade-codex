# Follow-up: transfer requests as CSV

Add CSV export and import to the existing application. Preserve every existing
record and the original public behavior. Keep the same operating/startup contract.

- `GET /api/requests/export.csv` exports all records, independent of UI filters,
  as UTF-8 `text/csv` with the header `id,title,description,status`. Include
  Content-Disposition with an attachment filename.
- `POST /api/requests/import.csv` accepts raw UTF-8 CSV with Content-Type
  `text/csv` and exactly the header `title,description,status`. Append new records
  with fresh IDs, applying the existing field rules. Reply 201 with
  `{"imported": number}`. A header-only document succeeds with zero imports.
- Accept both LF and CRLF record separators. A quoted cell can contain commas,
  line breaks and double quotes; represent a quote inside a quoted cell as two
  quotes. Preserve description content. Reject malformed quoting, wrong header,
  wrong column count or any invalid row with 400 and the existing error envelope.
  A failed import is atomic: no row is saved and old records stay unchanged.
- Limit imports to 1 MiB and 1,000 data rows; reject either excess with 400 or
  413 and an error message. No network download or additional external service.
- Add an `Export CSV` link or button and a file input labelled `Import CSV`,
  with an `Import requests` action. Show the imported count or an actionable
  error. Refresh the visible list after success. Preserve the current list on
  error. Document the format, run the application and relevant checks, repair
  within the remaining allowance, then stop test servers and report results.
