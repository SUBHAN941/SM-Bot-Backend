// services/utilityService.js - Password, QR Code, UUID, etc.

import { v4 as uuidv4 } from 'uuid';

/**
 * 🔐 Generate a strong password
 */
export function generatePassword(length = 16, options = {}) {
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';

  let chars = lowercase;
  if (options.uppercase !== false) chars += uppercase;
  if (options.numbers !== false) chars += numbers;
  if (options.symbols !== false) chars += symbols;

  let password = '';
  
  // Ensure at least one character from each category
  if (options.uppercase !== false) password += uppercase[Math.floor(Math.random() * uppercase.length)];
  if (options.numbers !== false) password += numbers[Math.floor(Math.random() * numbers.length)];
  if (options.symbols !== false) password += symbols[Math.floor(Math.random() * symbols.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];

  // Fill the rest
  for (let i = password.length; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  // Shuffle the password
  password = password.split('').sort(() => Math.random() - 0.5).join('');

  return {
    password,
    length,
    strength: length >= 16 ? "Strong 💪" : length >= 12 ? "Medium 👍" : "Weak ⚠️",
    source: "Password Generator"
  };
}

/**
 * 📱 Generate QR Code URL
 */
export function generateQRCode(text, size = 200) {
  const url = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(text)}`;
  return {
    text,
    qrCodeUrl: url,
    size: `${size}x${size}`,
    source: "QR Server API"
  };
}

/**
 * 🆔 Generate UUID
 */
export function generateUUID() {
  return {
    uuid: uuidv4(),
    version: 4,
    source: "UUID Generator"
  };
}

/**
 * 🎲 Generate random numbers
 */
export function generateRandomNumber(min = 1, max = 100, count = 1) {
  const numbers = [];
  for (let i = 0; i < count; i++) {
    numbers.push(Math.floor(Math.random() * (max - min + 1)) + min);
  }
  return {
    min, 
    max, 
    count,
    numbers: count === 1 ? numbers[0] : numbers,
    source: "Random Generator"
  };
}

/**
 * 🔗 Generate short hash
 */
export function generateShortHash(length = 8) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let hash = '';
  for (let i = 0; i < length; i++) {
    hash += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return {
    hash,
    length,
    source: "Hash Generator"
  };
}

export default {
  generatePassword,
  generateQRCode,
  generateUUID,
  generateRandomNumber,
  generateShortHash
};