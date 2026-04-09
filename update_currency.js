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
    } else if (file.endsWith('.tsx')) {
      results.push(file);
    }
  });
  return results;
}

const files = walk('./src');
files.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  if (content.includes('formatCurrency') && f !== path.resolve('./src/lib/utils.ts') && f !== path.resolve('./src/lib/SettingsContext.tsx')) {
    
    // Replace import
    // "formatCurrency, "
    content = content.replace(/formatCurrency,\s*/g, '');
    // ", formatCurrency"
    content = content.replace(/,\s*formatCurrency/g, '');
    // "import { formatCurrency } from '@/lib/utils';"
    content = content.replace(/import\s*\{\s*formatCurrency\s*\}\s*from\s+['"]@\/lib\/utils['"];?\n?/g, '');
    
    // Check if useSettings is imported
    if (!content.includes('useSettings')) {
      content = 'import { useSettings } from "@/lib/SettingsContext";\n' + content;
    }

    // Inside the component definition
    content = content.replace(/export (?:default )?function\s+[A-Za-z0-9_]+\([^)]*\)\s*\{/, match => {
      return match + '\n  const { formatPrice: formatCurrency } = useSettings();\n';
    });
    
    fs.writeFileSync(f, content, 'utf8');
    console.log('Updated', f);
  }
});
