# Security notes

QuoteFlow is a static client-side demo. It has no backend, database, authentication layer or server-side command execution.

## Current protections

- User-controlled quote and catalog values are rendered through DOM text nodes, not HTML injection sinks.
- A restrictive Content Security Policy allows scripts only from the same origin and blocks plugins/objects.
- CSV exports neutralize spreadsheet-formula prefixes such as =, +, - and @ and restore them on safe re-import.
- Quote-line and catalog CSV parsing is limited to 5 MB, 10,000 rows, 100 columns and 10,000 characters per field.
- Quote files are limited to 2 MB and 500 line items.
- Catalogs are limited to 1,000 items, with explicit limits on names and product codes.
- Quote fields have explicit length limits and only known properties are restored from saved files.
- Catalog data loaded from local storage or CSV is normalized before use.
- No eval, new Function or executable content is used when opening .qflow files or catalog data.

## Important limitations

.qflow files are JSON data containers, not encrypted archives. Do not treat them as secret storage.

Catalog data is stored in the browser's local storage. Clearing browser/site data can remove local catalog changes, so the CSV export should be used as a backup for important catalog data.

The CSP is delivered through a meta tag because this demo is hosted on GitHub Pages. A production deployment should enforce CSP and other security headers at the HTTP layer.

This project is a portfolio demo, not a security-audited accounting product.
