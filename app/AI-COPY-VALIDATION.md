# AI answer handoff and notebook icon update

The app now asks capable external AI interfaces for a short notice, an initially open details panel and a dedicated button that copies the complete import JSON. If interactive output is unavailable, the prompt requests the complete JSON in ordinary answer text. Initial plans, additional places, plan consultation and cost estimates share these output rules.

Copy guidance distinguishes the dedicated JSON button from the normal overlapping-squares answer copy button. Returning to the app opens the manual paste alternative. The importer finds travel JSON among explanatory text and multiple fenced blocks, ignores empty examples, asks for the real JSON when multiple different populated objects are ambiguous, repairs truncated travel objects even after prose braces, unwraps nested travel data, and recognizes repeated objects despite different key order. ChatGPT and Claude links retain prompt auto-fill for long prompts; Gemini retains the copy/paste flow. Resuming an interrupted flow reconstructs the prompt.

The home-screen icon is the existing sand notebook design with a red destination, white route and yellow bookmark. PNGs are generated at 180, 192 and 512 pixels. Icon URLs are versioned to avoid reusing the old purple icon. The existing blue/cream app design is retained. Native build resources also use the notebook icon and a white launch background; the iOS asset-generation command no longer requests the old purple/dark backgrounds.

## Validation

- 21 existing app regression scripts passed on 2026-10-12, including arrival boundaries, AI import/display, facility totals, budget, replacement, photos, and exact source/generated HTML parity.
- Added portable regression scripts for prompt auto-fill and mixed-answer JSON extraction; both passed. The two Devin parser findings were reproduced and fixed, with five repeated runs per sample/truncation input. Existing regression scripts were rerun after the fix.
- Local generated www/index.html and published app/index.html are identical. www is an ignored build directory, not an additional published source tree.

## Known limitations

External AI interactive output is not reliable. The latest ten recorded new-trip checks produced six successful dedicated-copy/import results. Two failed with a render error after copying; two produced only a notice. This is not fixed by this release. Ordinary JSON output and recovery instructions remain available.

Trip content still needs user review: recorded generated plans included a day-trip hotel, insufficient extra candidates, and unmatched spot references. Facility prices were not independently verified in those display tests. The unconditional hotel check-in prompt remains a known separate issue.

OAuth login, share-target receiving, Word/file transfer and other standalone experiments are not integrated by this change. Experimental credentials and test travel data are not included.
