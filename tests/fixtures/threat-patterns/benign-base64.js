// benign-base64.js — legitimate base64 use, should NOT trigger
const encoded = Buffer.from('hello world').toString('base64');
const decoded = Buffer.from(encoded, 'base64').toString('utf8');
console.log(decoded); // legitimate: just displays decoded value, never evaled
