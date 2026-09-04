# Task List

## Backend (server/index.js)
- [ ] Fetch full OSV vulnerability details (timestamps, severity, fix versions)
- [ ] Build vulnerability trace paths (root → vulnerable node)
- [ ] Compute severity distribution (Critical/High/Medium/Low)
- [ ] Compute direct vs transitive vulnerability counts
- [ ] Generate smart fix recommendations (DTReme-style)
- [ ] Add new fields to API response

## Frontend HTML (index.html)
- [ ] Add Section 03: Threat Intelligence (severity bars, direct/transitive, traces)
- [ ] Renumber sections in nav (03→04 Simulator, 04→05 AI Fix)
- [ ] Update AI Fix section title/description for Smart Fix

## Frontend CSS (style.css)
- [ ] Severity distribution bar styles
- [ ] Direct vs transitive comparison bar
- [ ] Vulnerability trace chain pipeline styles
- [ ] Smart fix recommendation card styles
- [ ] Fix lag badge styles
- [ ] Threat intel grid layout

## Frontend JS (app.js)
- [ ] Store new backend data in global state
- [ ] Build `buildThreatIntelDashboard()` function
- [ ] Build severity distribution renderer
- [ ] Build direct vs transitive renderer
- [ ] Build trace path selector and chain visualizer
- [ ] Upgrade `generateAIFix()` → smart fix with DTReme logic
- [ ] Wire up initialization

## Verification
- [ ] Restart backend and test with a package.json upload
