// malicious-base64-eval.js — triggers thr-obfuscation-base64-eval-js
const payload = Buffer.from('Y29uc29sZS5sb2coImhpIik=', 'base64').toString();
eval(payload);

// Also triggers with atob
const p2 = atob('Y29uc29sZS5sb2coImhpIik=');
eval(p2);
