# Build, Packaging, and Release

## Build principles
- Keep source separate from generated browser packages.
- Generate browser-specific manifests from documented configurations.
- Do not package secrets or private portal data.
- Exclude private test fixtures.
- Include icons, license, README, and accurate privacy disclosures.
- Validate manifest permissions before packaging.

## Local installation

### Chromium browsers
1. Build the browser-specific package.
2. Open the browser extension management page.
3. Enable Developer Mode.
4. Select Load unpacked.
5. Choose the correct unpacked build directory.
6. Open the extension and connect through official portal login pages.

### Firefox
Use the Firefox-specific build and follow current temporary/permanent add-on installation and signing requirements.

### Safari
Use the Safari Web Extension workflow with required Apple tooling and platform setup.

## Store release checklist
- [ ] Correct browser-specific manifest
- [ ] Minimum permissions
- [ ] Accurate description
- [ ] Privacy policy
- [ ] No credential collection
- [ ] No undisclosed external transmission
- [ ] Screenshots show actual functionality
- [ ] Tested package
- [ ] No private fixtures or debug secrets
- [ ] Portal terms and university policies reviewed
- [ ] Store policies reviewed

## Versioning
Use semantic versioning. Document data migrations and permission changes in release notes.
