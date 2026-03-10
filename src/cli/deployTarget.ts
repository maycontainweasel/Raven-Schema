type PlainObject = Record<string, unknown>;

function isPlainObject(value: unknown): value is PlainObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function deepMerge(base: PlainObject, override: PlainObject): PlainObject {
  const merged: PlainObject = { ...base };
  for (const [key, value] of Object.entries(override)) {
    const existing = merged[key];
    if (isPlainObject(existing) && isPlainObject(value)) {
      merged[key] = deepMerge(existing, value);
      continue;
    }
    merged[key] = value;
  }
  return merged;
}

export function resolveDeployTarget(
  deploy: PlainObject | undefined,
  target: string | undefined
): { deploy: PlainObject | undefined; selectedTarget?: string } {
  if (!target || !target.trim()) {
    return { deploy };
  }

  const requested = target.trim().toLowerCase();
  const baseDeploy = isPlainObject(deploy) ? { ...deploy } : {};
  const targets = isPlainObject(baseDeploy.targets) ? (baseDeploy.targets as PlainObject) : null;
  const available = targets ? Object.keys(targets) : [];

  if (!targets || available.length === 0) {
    throw new Error(
      `Deploy target "${target}" requested but deploy.targets is not configured.`
    );
  }

  const selectedTarget = available.find((key) => key.toLowerCase() === requested);
  if (!selectedTarget) {
    throw new Error(
      `Unknown deploy target "${target}". Available targets: ${available.join(', ')}`
    );
  }

  const targetOverrides = targets[selectedTarget];
  if (!isPlainObject(targetOverrides)) {
    throw new Error(`deploy.targets.${selectedTarget} must be an object.`);
  }

  const deployWithoutTargets: PlainObject = { ...baseDeploy };
  delete deployWithoutTargets.targets;
  const resolved = deepMerge(deployWithoutTargets, targetOverrides);

  return {
    deploy: resolved,
    selectedTarget,
  };
}
