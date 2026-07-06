const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config/env');

async function hashPassword(password) {
  return bcrypt.hash(password, config.BCRYPT_ROUNDS);
}

async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

function signToken(payload) {
  return jwt.sign(payload, config.JWT_SECRET, { expiresIn: config.JWT_EXPIRES_IN });
}

function verifyToken(token) {
  return jwt.verify(token, config.JWT_SECRET);
}

function hasPermission(userPermissions, required) {
  if (!userPermissions) return false;
  if (userPermissions.includes('*')) return true;
  if (Array.isArray(required)) {
    return required.some(r => userPermissions.includes(r));
  }
  return userPermissions.includes(required);
}

module.exports = { hashPassword, verifyPassword, signToken, verifyToken, hasPermission };
