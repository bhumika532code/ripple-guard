const fs = require('fs');
const path = require('path');

const newLogo = `
      <a href="index.html" class="nav-brand" style="display: flex; flex-direction: column; align-items: flex-start; justify-content: center; gap: 0;">
        <svg viewBox="0 0 240 46" height="38" xmlns="http://www.w3.org/2000/svg" style="overflow: visible;">
          <g transform="translate(12, 23) scale(0.8)">
            <!-- Black spider web icon -->
            <circle cx="0" cy="0" r="16" fill="none" stroke="#000000" stroke-width="1.8" stroke-dasharray="2 3"/>
            <circle cx="0" cy="0" r="10" fill="none" stroke="#111111" stroke-width="1.2"/>
            <circle cx="0" cy="0" r="4" fill="none" stroke="#222222" stroke-width="1.2"/>
            <path d="M-16,0 L16,0 M0,-16 L0,16 M-11.3,-11.3 L11.3,11.3 M-11.3,11.3 L11.3,-11.3" stroke="#000000" stroke-width="1.8"/>
            <!-- Center spider dot -->
            <circle cx="0" cy="0" r="2" fill="#000000"/>
          </g>
          <text x="40" y="32" font-family="'Outfit', sans-serif" font-weight="900" font-size="28" letter-spacing="-0.5" fill="#000000">
            WebNode
          </text>
        </svg>
`;

function replaceLogo(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  content = content.replace(/<a href="index\.html" class="nav-brand"[\s\S]*?<\/svg>/, newLogo);
  fs.writeFileSync(filePath, content, 'utf-8');
}

const pagesDir = path.join(__dirname, 'frontend', 'pages');
const htmlFiles = fs.readdirSync(pagesDir).filter(f => f.endsWith('.html'));

for (const file of htmlFiles) {
  replaceLogo(path.join(pagesDir, file));
}

// Also update index.html and pro.html
replaceLogo(path.join(__dirname, 'frontend', 'index.html'));
if (fs.existsSync(path.join(__dirname, 'frontend', 'pro.html'))) {
  replaceLogo(path.join(__dirname, 'frontend', 'pro.html'));
}

console.log('Logos updated successfully to black, bigger version.');
