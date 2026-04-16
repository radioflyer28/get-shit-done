// benign-postinstall.js — legitimate install script, no network calls
const fs = require('fs');
const path = require('path');

// Just creates a local config file
const configPath = path.join(__dirname, 'config.json');
if (!fs.existsSync(configPath)) {
  fs.writeFileSync(configPath, JSON.stringify({ initialized: true }));
}
console.log('Setup complete');
