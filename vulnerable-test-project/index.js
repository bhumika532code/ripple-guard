// Vulnerable Demo App - for testing WebNode Sentinel
const express = require('express');
const lodash = require('lodash');
const axios = require('axios');

const app = express();

app.get('/', (req, res) => {
  res.json({
    message: 'This app has intentionally vulnerable dependencies!',
    packages: {
      lodash: '4.17.15 — Prototype Pollution (CVE-2021-23337)',
      axios: '0.21.0 — SSRF (CVE-2021-3749)',
      express: '4.17.1 — Open Redirect',
      minimist: '1.2.5 — Prototype Pollution',
      'node-forge': '0.10.0 — Multiple CVEs',
    }
  });
});

app.listen(4000, () => console.log('Vulnerable demo running on port 4000'));
