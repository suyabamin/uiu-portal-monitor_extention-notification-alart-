# Cross-Browser Compatibility

## Target browsers
Chrome, Microsoft Edge, Brave, Opera, Firefox, and Safari (separate packaging and validation).

## Strategy
Maintain one shared JavaScript core and browser-specific manifests/build configurations. Keep API differences inside `src/compatibility/`. Use standard WebExtensions APIs where possible. `webextension-polyfill` can normalize some Promise-based APIs but does not erase browser differences.

## Chromium browsers
Chrome, Edge, Brave, and Opera are Chromium-based, but store packaging, review, browser versions, permissions, and behavior may differ. Test each browser independently.

## Firefox
Create and test a Firefox-specific build. Background execution, manifest support, and API availability may differ from Chromium.

## Safari
Safari Web Extensions require Apple tooling and a separate packaging workflow. Do not treat a Chromium package copied into a folder as Safari support.

## Build outputs
```text
dist/
  chrome/
  edge/
  brave/
  opera/
  firefox/
  safari/
```

Only generate/label builds that pass browser-specific smoke tests. Mark untested targets experimental.

## Compatibility matrix
| Capability | Chrome | Edge | Brave | Opera | Firefox | Safari |
|---|---|---|---|---|---|---|
| Install/load | Test | Test | Test | Test | Test | Test |
| Alarms | Test | Test | Test | Test | Test | Test |
| Notifications | Test | Test | Test | Test | Test | Test |
| Storage | Test | Test | Test | Test | Test | Test |
| Authenticated portal read | Test | Test | Test | Test | Test | Test |
| Background lifecycle | Test | Test | Test | Test | Test | Test |

Do not mark a cell supported until tested.
