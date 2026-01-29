const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const ROOT = path.resolve(__dirname, '..');
const GENERATED_DIR = path.join(ROOT, 'server', 'trpc', 'routers', 'generated');
const GENERATED_TABLES_DIR = path.join(ROOT, 'app', 'types', 'schema', 'generated', 'tables');
const INDEX_PATH = path.join(GENERATED_DIR, 'index.ts');
const OUTPUT_PATH = path.join(ROOT, 'app', 'data', 'router-manifest.json');

const readText = (filePath) => fs.readFileSync(filePath, 'utf8');

const parseIndexMap = () => {
  const text = readText(INDEX_PATH);
  const importMap = new Map();
  const routerMap = new Map();

  const importRegex = /import\s+\{\s*(\w+)\s*\}\s*from\s*'\.\/([^']+)'/g;
  let match = null;
  while ((match = importRegex.exec(text))) {
    importMap.set(match[1], match[2]);
  }

  const routerRegex = /"([^"]+)"\s*:\s*(\w+)/g;
  while ((match = routerRegex.exec(text))) {
    routerMap.set(match[1], match[2]);
  }

  return { importMap, routerMap };
};

const isRouterCall = (node) => {
  if (!ts.isCallExpression(node)) return false;
  const expr = node.expression;
  return ts.isPropertyAccessExpression(expr) && expr.name.text === 'router';
};

const normalizeField = (field) => ({
  key: field.key,
  type: field.type,
  required: field.required !== false,
  itemsType: field.itemsType,
  enumValues: field.enumValues,
  fields: field.fields,
});

const mergeFields = (base, extra) => {
  const merged = { ...(base || {}) };
  Object.entries(extra || {}).forEach(([key, value]) => {
    merged[key] = { ...(merged[key] || {}), ...value };
  });
  return merged;
};

const parseObjectShape = (node, ctx) => {
  const fields = {};
  if (!node || !ts.isObjectLiteralExpression(node)) return fields;
  node.properties.forEach((prop) => {
    if (!ts.isPropertyAssignment(prop)) return;
    const key = prop.name.getText(ctx.sourceFile).replace(/['"]/g, '');
    const field = parseZodType(prop.initializer, ctx);
    fields[key] = normalizeField({ key, ...field });
  });
  return fields;
};

const parseZodType = (node, ctx) => {
  if (!node) return { type: 'unknown', required: true };

  if (ts.isIdentifier(node)) {
    const refName = node.text;
    if (ctx.schemaMap[refName]) {
      return { type: 'object', required: true, fields: ctx.schemaMap[refName] };
    }
    return { type: 'ref', required: true, ref: refName };
  }

  if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
    const method = node.expression.name.text;
    const target = node.expression.expression;

    if (method === 'optional' || method === 'nullable') {
      const inner = parseZodType(target, ctx);
      return { ...inner, required: false };
    }

    if (method === 'array') {
      const item = node.arguments[0]
        ? parseZodType(node.arguments[0], ctx)
        : { type: 'unknown', required: true };
      return { type: 'array', required: true, itemsType: item.type };
    }

    if (method === 'object') {
      const fields = parseObjectShape(node.arguments[0], ctx);
      return { type: 'object', required: true, fields };
    }

    if (method === 'enum') {
      const values = [];
      const arg = node.arguments[0];
      if (arg && ts.isArrayLiteralExpression(arg)) {
        arg.elements.forEach((el) => {
          if (ts.isStringLiteral(el)) values.push(el.text);
        });
      }
      return { type: 'enum', required: true, enumValues: values };
    }

    if (method === 'record') return { type: 'record', required: true };
    if (method === 'union') return { type: 'union', required: true };
    if (method === 'string') return { type: 'string', required: true };
    if (method === 'number') return { type: 'number', required: true };
    if (method === 'boolean') return { type: 'boolean', required: true };
    if (method === 'any') return { type: 'any', required: true };
    if (method === 'literal') return { type: 'literal', required: true };

    if (['min', 'max', 'int', 'nonempty', 'default', 'refine', 'transform', 'describe'].includes(method)) {
      return parseZodType(target, ctx);
    }

    return parseZodType(target, ctx);
  }

  if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
    const name = node.expression.text;
    if (name === 'z' && node.arguments.length) {
      return parseZodType(node.arguments[0], ctx);
    }
  }

  return { type: 'unknown', required: true };
};

const parseSchemaExpression = (node, ctx) => {
  if (!node) return {};
  if (ts.isIdentifier(node) && ctx.schemaMap[node.text]) {
    return ctx.schemaMap[node.text];
  }

  if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
    const method = node.expression.name.text;
    const target = node.expression.expression;

    if (method === 'object') {
      return parseObjectShape(node.arguments[0], ctx);
    }

    if (method === 'merge') {
      const left = parseSchemaExpression(target, ctx);
      const right = parseSchemaExpression(node.arguments[0], ctx);
      return mergeFields(left, right);
    }

    if (method === 'partial') {
      const base = parseSchemaExpression(target, ctx);
      const partial = {};
      Object.entries(base).forEach(([key, value]) => {
        partial[key] = { ...value, required: false };
      });
      return partial;
    }

    if (method === 'pick') {
      const base = parseSchemaExpression(target, ctx);
      const arg = node.arguments[0];
      if (!arg || !ts.isObjectLiteralExpression(arg)) return base;
      const picked = {};
      arg.properties.forEach((prop) => {
        if (!ts.isPropertyAssignment(prop)) return;
        const key = prop.name.getText(ctx.sourceFile).replace(/['"]/g, '');
        if (base[key]) picked[key] = base[key];
      });
      return picked;
    }

    if (method === 'extend') {
      const base = parseSchemaExpression(target, ctx);
      const extra = parseObjectShape(node.arguments[0], ctx);
      return mergeFields(base, extra);
    }

    if (method === 'optional') {
      return parseSchemaExpression(target, ctx);
    }

    return parseSchemaExpression(target, ctx);
  }

  if (ts.isCallExpression(node)) {
    const parsed = parseZodType(node, ctx);
    return parsed.fields || {};
  }

  return {};
};

const extractSchemaMap = (filePath, baseSchemaMap) => {
  const text = readText(filePath);
  const sourceFile = ts.createSourceFile(filePath, text, ts.ScriptTarget.Latest, true);
  const schemaMap = { ...(baseSchemaMap || {}) };

  sourceFile.statements.forEach((stmt) => {
    if (!ts.isVariableStatement(stmt)) return;
    stmt.declarationList.declarations.forEach((decl) => {
      if (!decl.initializer || !ts.isIdentifier(decl.name)) return;
      const name = decl.name.text;
      const ctx = { sourceFile, schemaMap };
      const fields = parseSchemaExpression(decl.initializer, ctx);
      if (Object.keys(fields).length) {
        schemaMap[name] = fields;
      }
    });
  });

  return { sourceFile, schemaMap };
};

const extractProcedureInfo = (node, sourceFile) => {
  let current = node;
  let method = null;
  let inputText = null;

  while (ts.isCallExpression(current)) {
    const expr = current.expression;
    if (ts.isPropertyAccessExpression(expr)) {
      const name = expr.name.text;
      if ((name === 'mutation' || name === 'query') && !method) {
        method = name;
      }
      if (name === 'input' && current.arguments.length) {
        inputText = current.arguments[0].getText(sourceFile);
      }
      current = expr.expression;
      continue;
    }
    break;
  }

  let input = null;
  if (inputText) {
    const requestSchemaMatch = inputText.match(/^RequestSchema\(([^)]+)\)$/);
    if (requestSchemaMatch) {
      input = {
        wrapper: 'RequestSchema',
        schema: requestSchemaMatch[1].trim(),
        raw: inputText,
      };
    } else {
      input = { raw: inputText };
    }
  }

  return { method: method || 'query', input };
};

const buildRouterFromObject = (routerName, objectLiteral, sourceFile, schemaMap, routers) => {
  const router = { name: routerName, endpoints: [], children: [] };

  if (!objectLiteral || !ts.isObjectLiteralExpression(objectLiteral)) return router;

  objectLiteral.properties.forEach((prop) => {
    if (!ts.isPropertyAssignment(prop)) return;
    const key = prop.name.getText(sourceFile).replace(/['"]/g, '');
    const value = prop.initializer;

    if (ts.isCallExpression(value)) {
      if (isRouterCall(value)) {
        const inlineName = `${routerName}_${key}`;
        const inlineArg = value.arguments[0];
        const childRouter = buildRouterFromObject(inlineName, inlineArg, sourceFile, schemaMap, routers);
        routers.set(inlineName, childRouter);
        router.children.push({ name: key, ref: inlineName });
        return;
      }

      const info = extractProcedureInfo(value, sourceFile);
      router.endpoints.push({
        name: key,
        method: info.method,
        input: info.input,
        fields: info.input?.schema && schemaMap[info.input.schema]
          ? schemaMap[info.input.schema]
          : null,
      });
      return;
    }

    if (ts.isIdentifier(value)) {
      router.children.push({ name: key, ref: value.getText(sourceFile) });
    }
  });

  return router;
};

const extractRouterDefinitions = (filePath, baseSchemaMap) => {
  const text = readText(filePath);
  const sourceFile = ts.createSourceFile(filePath, text, ts.ScriptTarget.Latest, true);
  const { schemaMap } = extractSchemaMap(filePath, baseSchemaMap);
  const routers = new Map();

  const visit = (node) => {
    if (ts.isVariableDeclaration(node) && node.initializer && isRouterCall(node.initializer)) {
      const routerName = node.name.getText(sourceFile);
      const callExpr = node.initializer;
      const firstArg = callExpr.arguments[0];
      const router = buildRouterFromObject(routerName, firstArg, sourceFile, schemaMap, routers);
      routers.set(routerName, router);
    }

    ts.forEachChild(node, visit);
  };

  visit(sourceFile);

  return routers;
};

const main = () => {
  if (!fs.existsSync(INDEX_PATH)) {
    throw new Error(`Missing generated index at ${INDEX_PATH}`);
  }

  const { importMap, routerMap } = parseIndexMap();
  const routerFiles = new Set(importMap.values());
  const routerDefs = new Map();
  const baseSchemaMap = {};

  if (fs.existsSync(GENERATED_TABLES_DIR)) {
    const tableFiles = fs.readdirSync(GENERATED_TABLES_DIR).filter((file) => file.endsWith('.ts'));
    tableFiles.forEach((file) => {
      const filePath = path.join(GENERATED_TABLES_DIR, file);
      const { schemaMap } = extractSchemaMap(filePath, baseSchemaMap);
      Object.assign(baseSchemaMap, schemaMap);
    });
  }

  routerFiles.forEach((fileBase) => {
    const filePath = path.join(GENERATED_DIR, `${fileBase}.ts`);
    if (!fs.existsSync(filePath)) return;
    const defs = extractRouterDefinitions(filePath, baseSchemaMap);
    defs.forEach((value, key) => {
      routerDefs.set(key, { ...value, file: `${fileBase}.ts` });
    });
  });

  const manifest = {
    generatedAt: new Date().toISOString(),
    source: 'schema-docs/server/trpc/routers/generated',
    models: {},
    routers: {},
  };

  routerDefs.forEach((value, key) => {
    manifest.routers[key] = value;
  });

  const buildEndpoints = (routerName, prefix) => {
    const router = routerDefs.get(routerName);
    if (!router) return [];
    const endpoints = [];
    router.endpoints.forEach((endpoint) => {
      const pathSegments = [...prefix, endpoint.name];
      endpoints.push({
        path: pathSegments.join('.'),
        name: endpoint.name,
        method: endpoint.method,
        input: endpoint.input,
        fields: endpoint.fields,
        router: routerName,
        file: router.file,
      });
    });
    router.children.forEach((child) => {
      endpoints.push(...buildEndpoints(child.ref, [...prefix, child.name]));
    });
    return endpoints;
  };

  routerMap.forEach((routerVar, modelKey) => {
    const endpoints = buildEndpoints(routerVar, [modelKey]);
    manifest.models[modelKey] = {
      router: routerVar,
      file: routerDefs.get(routerVar)?.file || null,
      endpoints,
    };
  });

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(manifest, null, 2));
  console.log(`Router manifest written to ${OUTPUT_PATH}`);
};

main();
