import crypto from 'crypto';
import fs from 'fs';

export function sha256OfFile(filePath) {
  const hash = crypto.createHash('sha256');
  const stream = fs.createReadStream(filePath);
  return new Promise((resolve, reject) => {
    stream.on('data', (d) => hash.update(d));
    stream.on('error', reject);
    stream.on('end', () => resolve(hash.digest('hex')));
  });
}

export function sha256OfString(s) {
  return crypto.createHash('sha256').update(s).digest('hex');
}
