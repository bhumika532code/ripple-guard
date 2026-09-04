// Every package (and app) in our little ecosystem.
// "layer" just controls where it's drawn on screen — top to bottom.
// "vuln" is its OWN reported vulnerability score (0-100), before we
// factor in how many other things depend on it.

let NODES = [];

// Every "A depends on B" connection.
// [from, to] means: "from" needs "to" to run.

let EDGES = [];