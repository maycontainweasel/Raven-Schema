const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const MANIFEST_PATH = path.join(ROOT, 'app', 'data', 'router-manifest.json');
const OUTPUT_PATH = path.join(ROOT, 'docs', 'api', 'ROUTER-CHARTER.md');

const taxonomyOps = new Set([
  'createTaxonomy',
  'addTerm',
  'removeTerm',
  'attach',
  'detach',
  'getTerms',
  'getRecordTerms',
]);
const crudOps = new Set(['create', 'update', 'delete']);

const readManifest = () => {
  if (!fs.existsSync(MANIFEST_PATH)) return null;
  const raw = fs.readFileSync(MANIFEST_PATH, 'utf8');
  return JSON.parse(raw);
};

const groupEndpoints = (endpoints) => {
  const crud = [];
  const typesense = [];
  const taxonomies = new Map();
  const resources = [];
  const others = [];

  endpoints.forEach((endpoint) => {
    const segments = endpoint.path.split('.');
    if (segments.includes('typesense')) {
      typesense.push(endpoint);
      return;
    }
    if (segments.length > 2 && taxonomyOps.has(endpoint.name)) {
      const key = segments[1];
      const list = taxonomies.get(key) || [];
      list.push(endpoint);
      taxonomies.set(key, list);
      return;
    }
    if (segments.length === 2 && crudOps.has(endpoint.name)) {
      crud.push(endpoint);
      return;
    }
    if (segments.length === 2) {
      resources.push(endpoint);
      return;
    }
    others.push(endpoint);
  });

  return { crud, typesense, taxonomies, resources, others };
};

const formatFields = (fields) => {
  if (!fields || typeof fields !== 'object') return '';
  const keys = Object.values(fields).map((field) => {
    if (!field || typeof field !== 'object') return null;
    const name = field.key || 'field';
    const required = field.required === false ? 'optional' : 'required';
    return `${name} (${required})`;
  });
  return keys.filter(Boolean).join(', ');
};

const describeTaxonomyInput = (endpoint) => {
  switch (endpoint.name) {
    case 'createTaxonomy':
      return 'data: taxonomy payload';
    case 'addTerm':
      return 'data: term payload (label required, key optional)';
    case 'removeTerm':
      return 'data: term key (string)';
    case 'attach':
    case 'detach':
      return 'data: { id: <record sub-id>, term: <term key> }';
    case 'getRecordTerms':
      return 'data: { id: <record sub-id> }';
    case 'getTerms':
      return 'data: {}';
    default:
      return 'data: taxonomy payload';
  }
};

const examplePayloadForEndpoint = (endpoint) => {
  const isTaxonomy = endpoint.path.split('.').length > 2 && taxonomyOps.has(endpoint.name);
  if (isTaxonomy) {
    switch (endpoint.name) {
      case 'createTaxonomy':
        return { key: 'taxonomy-key', label: 'Label' };
      case 'addTerm':
        return { label: 'Term label' };
      case 'removeTerm':
        return 'term-key';
      case 'attach':
      case 'detach':
        return { id: 'record-sub-id', term: 'term-key' };
      case 'getRecordTerms':
        return { id: 'record-sub-id' };
      case 'getTerms':
        return {};
      default:
        return {};
    }
  }

  if (endpoint.path.includes('.typesense.')) {
    if (endpoint.name === 'refresh') return { limit: 100, start: 0 };
    if (endpoint.name === 'resource') return { id: 'record-sub-id' };
    return { limit: 10, start: 0 };
  }

  if (!endpoint.fields || typeof endpoint.fields !== 'object') return {};
  const payload = {};
  Object.values(endpoint.fields).forEach((field) => {
    if (!field || typeof field !== 'object') return;
    const name = field.key;
    if (!name || name === 'id') return;
    if (field.type === 'number') payload[name] = 0;
    else if (field.type === 'boolean') payload[name] = false;
    else payload[name] = '';
  });
  return payload;
};

const buildProcessSnippet = (endpoint) => {
  const payload = examplePayloadForEndpoint(endpoint);
  const payloadText =
    typeof payload === 'string' ? JSON.stringify(payload) : JSON.stringify(payload, null, 2);
  return [
    '```ts',
    `const { $process } = useCRUD()`,
    `const record = await $process('${endpoint.path}', ${payloadText}, { instance: 'test' })`,
    '```',
  ].join('\n');
};

const describeEndpoint = (endpoint) => {
  const base = `- \`${endpoint.path}\` (${endpoint.method})`;
  if (endpoint.path.includes('.typesense.')) {
    return `${base}\n  - input: RequestSchema<typesense payload>`;
  }
  if (endpoint.path.split('.').length > 2 && taxonomyOps.has(endpoint.name)) {
    return `${base}\n  - ${describeTaxonomyInput(endpoint)}`;
  }
  if (endpoint.fields) {
    const fields = formatFields(endpoint.fields);
    return fields ? `${base}\n  - fields: ${fields}\n  ${buildProcessSnippet(endpoint)}` : `${base}\n  ${buildProcessSnippet(endpoint)}`;
  }
  return `${base}\n  ${buildProcessSnippet(endpoint)}`;
};

const renderModelSection = (modelKey, model) => {
  const grouped = groupEndpoints(model.endpoints || []);
  const lines = [];
  lines.push(`### ${modelKey}`);

  if (grouped.crud.length) {
    lines.push(`- CRUD: ${grouped.crud.map((e) => e.name).join(', ')}`);
  }

  if (grouped.resources.length) {
    lines.push(`- Views/Resources: ${grouped.resources.map((e) => e.name).join(', ')}`);
  }

  if (grouped.taxonomies.size) {
    lines.push(`- Taxonomies:`);
    grouped.taxonomies.forEach((list, key) => {
      const methods = list.map((e) => e.name).join(', ');
      lines.push(`  - ${key}: ${methods}`);
    });
  }

  if (grouped.typesense.length) {
    const methods = grouped.typesense.map((e) => e.name).join(', ');
    lines.push(`- Typesense: ${methods}`);
  }

  if (grouped.others.length) {
    lines.push(`- Other: ${grouped.others.map((e) => e.path).join(', ')}`);
  }

  lines.push('');
  lines.push('Endpoints:');
  (model.endpoints || []).forEach((endpoint) => {
    lines.push(describeEndpoint(endpoint));
  });

  return lines.join('\n');
};

const renderCharter = (manifest) => {
  const header = `Title: Generated TRPC Router Charter
Scope: Generated routers only
Applies to: schema-docs /api, all generated apps that include schema-kit

This is the canonical, high‑level reference for **what methods exist on every generated TRPC router**, what they do, and how to call them.

If you are unsure which method to call for a task, start here and then consult:
- \`docs/api/ROUTER-PRIMER.md\`
- \`docs/primer/USECRUD.md\`
- \`docs/primer/RECORD-IDS.md\`

---

## Standard endpoint families

- CRUD: \`create\`, \`update\`, \`delete\`
- Views/Resources: \`resource\`, \`list\`, \`count\`, \`get\`, \`fetch\`
- Taxonomies (per taxonomy key):
  - \`createTaxonomy\`
  - \`addTerm\`
  - \`removeTerm\`
  - \`attach\`
  - \`detach\`
  - \`getTerms\`
  - \`getRecordTerms\`
- Typesense (when enabled): \`refresh\`, \`collection\`, \`list\`, \`count\`, \`resource\`

Term notes:
- Term tables are **per‑taxonomy**: \`t_<table>_<taxonomy>\`
- Term ID is **term key** (not \`stringID\`)
- \`addTerm\` accepts **label** (key optional; slug derived when missing)

---

## Generated endpoint summary (from router manifest)
`;

  const modelSections = Object.entries(manifest.models || {})
    .map(([key, model]) => renderModelSection(key, model))
    .join('\n\n');

  return `${header}\n${modelSections}\n`;
};

const manifest = readManifest();
if (!manifest) {
  console.warn(`⚠️  Missing router manifest at ${MANIFEST_PATH}`);
  process.exit(0);
}

const content = renderCharter(manifest);
fs.writeFileSync(OUTPUT_PATH, content);
console.log(`Router charter written to ${OUTPUT_PATH}`);
