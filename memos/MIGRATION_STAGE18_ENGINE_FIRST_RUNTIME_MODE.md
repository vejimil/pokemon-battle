# Stage 18 — Engine-first runtime mode cleanup

This step pushes the app farther away from the old browser-side custom battle authority and toward an explicit local-engine-first architecture.

## What changed

- Added explicit runtime descriptors in the UI/state layer:
  - engine-authoritative singles
  - legacy custom singles fallback
  - legacy custom doubles runtime
- Singles no longer silently fall back as if the legacy runtime were equivalent.
- Added an explicit opt-in checkbox before legacy custom singles fallback can be started when the local engine path is unavailable.
- Builder/runtime messaging now reflects the selected runtime mode instead of treating the custom runtime as the default truth.
- Item/ability implementation warnings tied to the old custom runtime are now shown only when the selected battle path actually uses that legacy runtime.
- Active battle state now carries runtime metadata so the battle panel can show which runtime is in control.
- Dynamax is intentionally disabled in the UI for now because there is no verified supported authoritative path in the current architecture.

## What this does not complete yet

- Doubles are still not engine-backed.
- Legacy custom runtime code still exists and is still used for doubles and optional singles fallback.
- Full removal of custom singles-resolution code from the codebase has not happened yet; this step mainly removes its authority from the preferred active path and UI messaging.
