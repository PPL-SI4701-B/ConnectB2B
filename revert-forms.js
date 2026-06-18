const fs = require('fs');
const files = [
  'e2e/FR-01-registrasi-umkm.spec.ts',
  'e2e/FR-02-registrasi-industri.spec.ts',
  'e2e/FR-03-login.spec.ts',
  'e2e/helpers/auth.ts'
];
for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/, \{ waitUntil: 'domcontentloaded' \}/g, '');
  fs.writeFileSync(file, content);
}
