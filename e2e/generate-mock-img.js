import fs from 'fs';
import path from 'path';

const dir = 'e2e';
if (!fs.existsSync(dir)){
    fs.mkdirSync(dir);
}

const base64Png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
fs.writeFileSync(path.join(dir, 'test-avatar.png'), Buffer.from(base64Png, 'base64'));
console.log('Mock image generated successfully.');
