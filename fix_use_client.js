const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.resolve(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      results.push(file);
    }
  });
  return results;
}

const files = walk('./src');
files.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  if (content.includes('"use client"') || content.includes("'use client'")) {
    const lines = content.split('\n');
    let useClientIndex = -1;
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim() === '"use client";' || lines[i].trim() === "'use client';") {
            useClientIndex = i;
            break;
        }
    }
    
    if (useClientIndex > 0) {
        const useClientLine = lines[useClientIndex];
        lines.splice(useClientIndex, 1);
        lines.unshift(useClientLine);
        fs.writeFileSync(f, lines.join('\n'), 'utf8');
        console.log('Fixed use client directive in', f);
    }
  }
});
