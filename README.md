# Pipeline flow jig

A d.AI brief 01 jig for link colour and opacity in the telemetry pipeline Sankey, with the decisions captured in GitHub.

## How a decision moves

1. A participant configures the jig (`index.html`) and presses **Record in GitHub**. A new issue opens prefilled with a JSON record and their rationale.
2. They submit the issue. `.github/workflows/record-decision.yml` runs `scripts/record-decision.mjs`, which validates the record, takes identity and time from GitHub, writes `decisions/<issue>.json` and rebuilds `decisions.json`. The Action comments and closes the issue.
3. The jig fetches `decisions.json` and shows the spread per variable, the median, and each record (with Load to reproduce any configuration). Results stay hidden until the participant records, and looking first is logged as `sawOthers: true`.
4. The decision owner ratifies by opening a PR that edits `defaults.json` (`baseline` and `settled`) and cites the issues. Merge is the decision; the jig then shows "Settled in #PR" next to that variable.

## Setup

- Replace `OWNER/REPO` in `index.html` (`JIG.repo`).
- Settings → Pages: deploy from the default branch, root folder. The jig reads `decisions.json` and `defaults.json` relative to itself.
- Settings → Actions → General: workflow permissions "Read and write".
- Create a `jig-decision` label (optional; the Action adds it if it exists).
- Bump `JIG.version` in `index.html` whenever the variants change. Records only aggregate within one version.

Remove the `example: true` records from `decisions.json` before sharing.

## Governance notes

- One record per person per jig version; a later issue or an edit replaces the earlier one, and git history keeps both.
- Issue text reaches the script through environment variables only.
- Private repos: Pages from a private repo needs GitHub Enterprise; otherwise publish the jig from a public repo or an internal Pages site.
