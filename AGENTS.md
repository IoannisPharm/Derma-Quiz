# AGENTS.md

## Project purpose

This repository hosts a mobile-first static scientific learning quiz for
field colleagues. The live site is deployed through GitHub Pages.

## Non-negotiable rules

1. Do not invent medical claims, percentages, study results, indications,
   contraindications, dosing instructions, or sources.
2. Preserve approved question wording unless explicitly asked to change it.
3. Add new questions to `data/questions.json`.
4. New questions default to:
   - `"medicalReviewStatus": "pending-review"`
   - `"medicalReviewDate": null`
   - `"source": "Source pending verification"` when no verified source is given
5. Every ID must be unique and follow `BRAND-001`.
6. Run `npm test` and `npm run check:js` after changes.
7. Do not deploy if validation fails.
8. Keep the app dependency-free unless the repository owner explicitly approves
   a framework or external service.

## Editing workflow

- Make focused changes.
- Validate locally.
- Summarize exactly which questions changed.
- Flag any content that still needs scientific verification.
