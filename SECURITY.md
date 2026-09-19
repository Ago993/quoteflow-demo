# Security notes

QuoteFlow is a static client-side demo. It has no backend, database, authentication layer or server-side command execution.

## Current protections

- User-controlled values are rendered through DOM text nodes, not HTML injection sinks.
- A restrictive Content Security Policy allows scripts only from the same origin and blocks plugins/objects.
- CSV exports neutralize spreadsheet-formula prefixes such as =, +, - and @ and restore them on safe re-import.
- CSV parsing is limited to 5 MB, 10,000 rows, 100 columns and 10,000 characters per field.
- Quote files are limited to 2 MB and 500 line items.
- Quote fields have explicit length limits and only known properties are restored from saved files.
- No eval, new Function or executable content is used when opening .qflow files.

## Important limitations

.qflow files are JSON data containers, not encrypted archives. Do not treat them as secret storage.

The CSP is delivered through a meta tag because this demo is hosted on GitHub Pages. A production deployment should enforce CSP and other security headers at the HTTP layer.

This project is a portfolio demo, not a security-audited accounting product.
