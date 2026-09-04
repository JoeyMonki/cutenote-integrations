const integrationVersionPattern = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-rc\.([1-9]\d*))?$/;

export function assertIntegrationVersion(version, label = "version") {
  if (typeof version !== "string" || !integrationVersionPattern.test(version)) {
    throw new Error(`${label} must be MAJOR.MINOR.PATCH or MAJOR.MINOR.PATCH-rc.N without numeric leading zeroes`);
  }
  return version;
}

export function assertReleaseIdentity(release) {
  const version = assertIntegrationVersion(release?.release_version, "release.json: release_version");
  const expectedName = `cutenote-integrations-v${version}`;
  if (release.release_tag !== expectedName) throw new Error("release.json: release_tag must match release_version");
  if (release.bundle_basename !== expectedName) throw new Error("release.json: bundle_basename must match release_tag");
  return version;
}
