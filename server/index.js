const express = require('express');
const cors = require('cors');
const multer = require('multer');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());

// Configure multer for file uploads
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}
const upload = multer({ dest: uploadDir });

app.post('/api/analyze', upload.single('packageJson'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const fileContent = fs.readFileSync(req.file.path, 'utf8');
    const pkg = JSON.parse(fileContent);
    const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
    
    const nodes = [];
    const edges = [];
    
    // Layer 0: The uploaded application
    const appName = pkg.name || 'uploaded-app';
    nodes.push({ id: appName, name: appName, type: 'app', layer: 0, vuln: 0 });
    
    const depNames = Object.keys(deps);
    
    // Prepare arrays for OSV
    const queries = [];
    const nodeOrder = []; // To keep track of which query belongs to which node
    
    // Layer 1: Direct dependencies
    depNames.forEach(dep => {
      nodes.push({ id: dep, name: dep, type: 'package', layer: 1, vuln: 0 });
      edges.push([appName, dep]);
      queries.push({ package: { name: dep, ecosystem: 'npm' } });
      nodeOrder.push(dep);
    });
    
    // Fetch Layer 2 (sub-dependencies) for visual depth
    // To keep it fast, we only query the NPM registry for the top 8 direct dependencies
    // and take up to 3 sub-dependencies each.
    const layer2Deps = new Set();
    const fetchPromises = depNames.slice(0, 8).map(async (dep) => {
      try {
        const response = await axios.get(`https://registry.npmjs.org/${dep}/latest`, { timeout: 3000 });
        const subDeps = Object.keys(response.data.dependencies || {}).slice(0, 3);
        subDeps.forEach(sub => {
          layer2Deps.add(sub);
          edges.push([dep, sub]);
        });
      } catch(e) {
        console.warn(`Failed to fetch sub-deps for ${dep}:`, e.message);
      }
    });
    
    await Promise.all(fetchPromises);
    
    // Add Layer 2 nodes
    layer2Deps.forEach(sub => {
      if (!nodes.find(n => n.id === sub)) {
        nodes.push({ id: sub, name: sub, type: 'package', layer: 2, vuln: 0 });
        queries.push({ package: { name: sub, ecosystem: 'npm' } });
        nodeOrder.push(sub);
      }
    });
    
    // Fetch vulnerabilities from OSV API
    let osvResults = [];
    const osvDetails = {};

    if (queries.length > 0) {
      try {
        // OSV API limit is 1000 queries per batch, we are well below that.
        const osvResponse = await axios.post('https://api.osv.dev/v1/querybatch', { queries });
        osvResults = osvResponse.data.results || [];
      } catch (err) {
        console.error("OSV API error:", err.message);
      }
    }
    
    // Map OSV results to nodes
    nodeOrder.forEach((nodeId, index) => {
      const node = nodes.find(n => n.id === nodeId);
      const result = osvResults[index];
      
      if (result && result.vulns && result.vulns.length > 0) {
        // Assign a vulnerability score based on the number of vulnerabilities found
        node.vuln = Math.min(100, result.vulns.length * 20); 
        // Store full details for the AI Fix section
        osvDetails[nodeId] = result.vulns; 
      } else {
        node.vuln = 0;
      }
    });
    
    // Clean up temp file
    fs.unlinkSync(req.file.path);
    
    // Return dynamically generated ecosystem
    res.json({ nodes, edges, osvDetails });
    
  } catch (error) {
    console.error(error);
    if (req.file) fs.unlinkSync(req.file.path);
    res.status(500).json({ error: error.message });
  }
});

const PORT = 3000;
app.listen(PORT, () => console.log(`Ripple Guard OSV Backend running on port ${PORT}`));
