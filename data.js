// Every package (and app) in our little ecosystem.
// "layer" just controls where it's drawn on screen — top to bottom.
// "vuln" is its OWN reported vulnerability score (0-100), before we
// factor in how many other things depend on it.

const NODES = [
  // Applications
  { id: "webapp",   name: "webapp",        type: "app", layer: 0, vuln: 0 },
  { id: "mobile",   name: "mobile-api",    type: "app", layer: 0, vuln: 0 },
  { id: "pipeline", name: "data-pipeline", type: "app", layer: 0, vuln: 0 },
  { id: "admin",    name: "admin-portal",  type: "app", layer: 0, vuln: 0 },

  // Mid-level packages
  { id: "ui-kit",        name: "ui-kit",       type: "package", layer: 1, vuln: 20 },
  { id: "api-gateway",   name: "api-gateway",  type: "package", layer: 1, vuln: 30 },
  { id: "orm-lib",       name: "orm-lite",     type: "package", layer: 1, vuln: 15 },
  { id: "job-scheduler", name: "cron-runner",  type: "package", layer: 1, vuln: 25 },
  { id: "auth-lib",      name: "auth-guard",   type: "package", layer: 1, vuln: 55 },
  { id: "report-gen",    name: "report-gen",   type: "package", layer: 1, vuln: 10 },

  // Shared low-level libraries
  { id: "http-client",     name: "http-client", type: "package", layer: 2, vuln: 40 },
  { id: "json-parser",     name: "fast-json",   type: "package", layer: 2, vuln: 18 },
  { id: "crypto-lib",      name: "crypto-core", type: "package", layer: 2, vuln: 60 },
  { id: "log-utils",       name: "log-utils",   type: "package", layer: 2, vuln: 22 },
  { id: "template-engine", name: "tmpl-engine", type: "package", layer: 2, vuln: 12 },

  // Deep core utilities — everything else is built on these
  { id: "core-utils",    name: "core-utils",    type: "package", layer: 3, vuln: 28 },
  { id: "string-utils",  name: "str-utils",     type: "package", layer: 3, vuln: 8 },
  { id: "event-emitter", name: "event-emitter", type: "package", layer: 3, vuln: 33 },
];

// Every "A depends on B" connection.
// [from, to] means: "from" needs "to" to run.

const EDGES = [
  ["webapp", "ui-kit"], ["webapp", "api-gateway"], ["webapp", "auth-lib"],
  ["mobile", "api-gateway"], ["mobile", "orm-lib"], ["mobile", "auth-lib"],
  ["pipeline", "orm-lib"], ["pipeline", "job-scheduler"], ["pipeline", "report-gen"],
  ["admin", "api-gateway"], ["admin", "orm-lib"], ["admin", "auth-lib"], ["admin", "report-gen"],

  ["ui-kit", "json-parser"], ["ui-kit", "log-utils"], ["ui-kit", "template-engine"],
  ["api-gateway", "http-client"], ["api-gateway", "json-parser"], ["api-gateway", "log-utils"],
  ["orm-lib", "json-parser"], ["orm-lib", "log-utils"],
  ["job-scheduler", "crypto-lib"], ["job-scheduler", "log-utils"],
  ["auth-lib", "http-client"], ["auth-lib", "crypto-lib"],
  ["report-gen", "http-client"], ["report-gen", "json-parser"], ["report-gen", "template-engine"],

  ["http-client", "core-utils"], ["http-client", "event-emitter"],
  ["json-parser", "core-utils"], ["json-parser", "string-utils"],
  ["crypto-lib", "string-utils"],
  ["log-utils", "core-utils"], ["log-utils", "event-emitter"],
  ["template-engine", "core-utils"],
];