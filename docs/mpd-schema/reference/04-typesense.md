Title: Typesense Collections + Views
Scope: global
Applies to: Typesense, Views, Admin UI

Typesense collections are generated from MPDG:
- `typesense::fn[...]` defines the view
- `queryBy`, `sortableFields`, `filters` configure search

Admin UI uses Typesense for directory pages:
- `useTypesenseDirectory` manages search, filters, paging
- refresh calls update Typesense on demand

Sorting only works for fields marked sortable in the schema.
