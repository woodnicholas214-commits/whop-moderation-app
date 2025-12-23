const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Find all TSX files in app/dashboard
const files = glob.sync('app/dashboard/**/*.tsx');

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let modified = false;

  // Update input/textarea/select with border-gray-300 to include dark mode
  const patterns = [
    // Input fields
    {
      regex: /className="([^"]*border border-gray-300[^"]*)"(?![^<]*dark:)/g,
      replacement: (match, p1) => {
        if (!p1.includes('dark:')) {
          modified = true;
          return `className="${p1} dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"`;
        }
        return match;
      }
    },
    // Select elements
    {
      regex: /className="([^"]*border border-gray-300[^"]*)"(?![^<]*dark:)/g,
      replacement: (match, p1) => {
        if (!p1.includes('dark:')) {
          modified = true;
          return `className="${p1} dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"`;
        }
        return match;
      }
    }
  ];

  patterns.forEach(({ regex, replacement }) => {
    content = content.replace(regex, replacement);
  });

  if (modified) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Updated ${file}`);
  }
});

console.log('Done!');

