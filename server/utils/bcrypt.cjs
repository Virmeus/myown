const crypto = require('crypto');
const { promisify } = require('util');

const pbkdf2 = promisify(crypto.pbkdf2);
const randomBytes = promisify(crypto.randomBytes);

// bcrypt-совместимое хеширование с использованием pbkdf2
async function hash(password, rounds = 12) {
  const salt = await randomBytes(16);
  const hash = await pbkdf2(password, salt, Math.pow(2, rounds), 64, 'sha512');
  return `$pbkdf2$${rounds}$${salt.toString('base64')}$${hash.toString('base64')}`;
}

async function compare(password, hashedPassword) {
  const parts = hashedPassword.split('$');
  if (parts[1] !== 'pbkdf2') return false;
  
  const rounds = parseInt(parts[2]);
  const salt = Buffer.from(parts[3], 'base64');
  const originalHash = parts[4];
  
  const hash = await pbkdf2(password, salt, Math.pow(2, rounds), 64, 'sha512');
  return hash.toString('base64') === originalHash;
}

async function genSalt(rounds = 12) {
  const salt = await randomBytes(16);
  return `$pbkdf2$${rounds}$${salt.toString('base64')}$`;
}

module.exports = { hash, compare, genSalt };
