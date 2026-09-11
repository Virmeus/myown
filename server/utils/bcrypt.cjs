const crypto = require('crypto');
const { promisify } = require('util');

const pbkdf2 = promisify(crypto.pbkdf2);
const randomBytes = promisify(crypto.randomBytes);

// bcrypt-совместимое хеширование с использованием pbkdf2
async function hash(password, saltOrRounds = 12) {
  // Если передана строка (salt), извлекаем rounds
  let rounds = 12;
  if (typeof saltOrRounds === 'string') {
    const parts = saltOrRounds.split('$');
    if (parts[1] === 'pbkdf2') {
      rounds = parseInt(parts[2]) || 12;
    }
  } else if (typeof saltOrRounds === 'number') {
    rounds = saltOrRounds;
  }
  
  const salt = await randomBytes(16);
  const iterations = Math.pow(2, rounds);
  const hashBuffer = await pbkdf2(password, salt, iterations, 64, 'sha512');
  return `$pbkdf2$${rounds}$${salt.toString('base64')}$${hashBuffer.toString('base64')}`;
}

async function compare(password, hashedPassword) {
  const parts = hashedPassword.split('$');
  if (parts[1] !== 'pbkdf2') return false;
  
  const rounds = parseInt(parts[2]) || 12;
  const salt = Buffer.from(parts[3], 'base64');
  const originalHash = parts[4];
  
  const iterations = Math.pow(2, rounds);
  const hashBuffer = await pbkdf2(password, salt, iterations, 64, 'sha512');
  return hashBuffer.toString('base64') === originalHash;
}

async function genSalt(rounds = 12) {
  return rounds; // Просто возвращаем число rounds
}

module.exports = { hash, compare, genSalt };
