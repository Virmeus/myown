const crypto = require('crypto');
const config = require('../config');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;
const ITERATIONS = 100000;

function deriveKey(password) {
  const salt = crypto.randomBytes(SALT_LENGTH);
  const key = crypto.pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, 'sha256');
  return { key, salt };
}

function encrypt(text) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const key = crypto.pbkdf2Sync(config.encryptionKey, Buffer.alloc(SALT_LENGTH), ITERATIONS, KEY_LENGTH, 'sha256');
  
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag();
  
  // Combine: iv + tag + encrypted
  const result = iv.toString('hex') + tag.toString('hex') + encrypted;
  return result;
}

function decrypt(encryptedText) {
  try {
    const iv = Buffer.from(encryptedText.slice(0, IV_LENGTH * 2), 'hex');
    const tag = Buffer.from(encryptedText.slice(IV_LENGTH * 2, IV_LENGTH * 2 + TAG_LENGTH * 2), 'hex');
    const encrypted = encryptedText.slice(IV_LENGTH * 2 + TAG_LENGTH * 2);
    
    const key = crypto.pbkdf2Sync(config.encryptionKey, Buffer.alloc(SALT_LENGTH), ITERATIONS, KEY_LENGTH, 'sha256');
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (err) {
    throw new Error('Ошибка дешифрования данных');
  }
}

function generatePassword(length = 16, options = {}) {
  const {
    uppercase = true,
    lowercase = true,
    numbers = true,
    symbols = true
  } = options;

  let chars = '';
  if (uppercase) chars += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  if (lowercase) chars += 'abcdefghijklmnopqrstuvwxyz';
  if (numbers) chars += '0123456789';
  if (symbols) chars += '!@#$%^&*()_+-=[]{}|;:,.<>?';
  
  if (!chars) chars = 'abcdefghijklmnopqrstuvwxyz0123456789';

  let password = '';
  for (let i = 0; i < length; i++) {
    const randomBytes = crypto.randomBytes(1);
    password += chars[randomBytes[0] % chars.length];
  }
  
  return password;
}

function generateAPIKey() {
  const segments = [];
  for (let i = 0; i < 4; i++) {
    segments.push(crypto.randomBytes(4).toString('hex'));
  }
  return segments.join('-');
}

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

module.exports = { encrypt, decrypt, generatePassword, generateAPIKey, generateToken };
