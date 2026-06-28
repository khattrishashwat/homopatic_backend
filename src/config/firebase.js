const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT;
const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

let serviceAccount;

if (serviceAccountJson) {
  try {
    serviceAccount = JSON.parse(serviceAccountJson);
  } catch (error) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON must be valid JSON');
  }
} else if (serviceAccountPath) {
  serviceAccount = JSON.parse(fs.readFileSync(path.resolve(serviceAccountPath), 'utf8'));
} else {
  throw new Error('FIREBASE_SERVICE_ACCOUNT or FIREBASE_SERVICE_ACCOUNT_JSON environment variable is required');
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

module.exports = admin;
