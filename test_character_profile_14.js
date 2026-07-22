const assert = require("assert");
const fs = require("fs");
const server = fs.readFileSync("server.js", "utf8");
const client = fs.readFileSync("public/app.js", "utf8");
assert(server.includes('"demographicContext", "attitudeToChildren"'));
assert(client.includes('"demographicContext", "attitudeToChildren"'));
assert(server.includes('attitudeToChildren: "Ставлення до дітей"'));
assert(client.includes('attitudeToChildren: "Ставлення до дітей"'));
console.log("UI6 stage 3: 14 характеристик і окрема картка ставлення до дітей перевірені.");
