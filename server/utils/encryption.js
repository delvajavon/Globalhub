import crypto from 'crypto'

/**
 * Encryption utility for securing CMS API credentials
 * Uses AES-256-GCM for authenticated encryption
 */

// Get encryption key from environment or generate a warning
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || (() => {
  console.warn('⚠️  WARNING: ENCRYPTION_KEY not set in environment. Using default key (NOT SECURE FOR PRODUCTION).')
  // Generate a deterministic key from a seed for development
  return crypto.createHash('sha256').update('globalhub-dev-key-change-in-production').digest()
})()

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16
const AUTH_TAG_LENGTH = 16

/**
 * Encrypts a credential string
 * @param {string} plaintext - The credential to encrypt
 * @returns {string} - Encrypted credential in format: iv:authTag:ciphertext (hex encoded)
 */
export function encryptCredential(plaintext) {
  if (!plaintext || typeof plaintext !== 'string') {
    throw new Error('Invalid credential: must be a non-empty string')
  }

  try {
    // Generate random initialization vector
    const iv = crypto.randomBytes(IV_LENGTH)
    
    // Create cipher
    const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv)
    
    // Encrypt the plaintext
    let encrypted = cipher.update(plaintext, 'utf8', 'hex')
    encrypted += cipher.final('hex')
    
    // Get authentication tag
    const authTag = cipher.getAuthTag()
    
    // Return as iv:authTag:ciphertext (all hex encoded)
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`
  } catch (error) {
    console.error('[Encryption] Error encrypting credential:', error.message)
    throw new Error('Failed to encrypt credential')
  }
}

/**
 * Decrypts an encrypted credential
 * @param {string} encryptedData - Encrypted credential in format: iv:authTag:ciphertext
 * @returns {string} - Decrypted plaintext credential
 */
export function decryptCredential(encryptedData) {
  if (!encryptedData || typeof encryptedData !== 'string') {
    throw new Error('Invalid encrypted data: must be a non-empty string')
  }

  try {
    // Split the encrypted data
    const parts = encryptedData.split(':')
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted data format. Expected: iv:authTag:ciphertext')
    }

    const [ivHex, authTagHex, encrypted] = parts
    
    // Convert from hex
    const iv = Buffer.from(ivHex, 'hex')
    const authTag = Buffer.from(authTagHex, 'hex')
    
    // Validate lengths
    if (iv.length !== IV_LENGTH || authTag.length !== AUTH_TAG_LENGTH) {
      throw new Error('Invalid encrypted data: incorrect iv or authTag length')
    }
    
    // Create decipher
    const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv)
    decipher.setAuthTag(authTag)
    
    // Decrypt
    let decrypted = decipher.update(encrypted, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    
    return decrypted
  } catch (error) {
    console.error('[Encryption] Error decrypting credential:', error.message)
    throw new Error('Failed to decrypt credential')
  }
}

/**
 * Test encryption/decryption round-trip
 */
export function testEncryption() {
  try {
    const testCredential = 'test-api-key:test-secret-value'
    const encrypted = encryptCredential(testCredential)
    const decrypted = decryptCredential(encrypted)
    
    if (decrypted !== testCredential) {
      throw new Error('Decrypted value does not match original')
    }
    
    console.log('[Encryption] ✓ Test passed')
    return true
  } catch (error) {
    console.error('[Encryption] ✗ Test failed:', error.message)
    return false
  }
}

/**
 * Generate a secure random encryption key (for initial setup)
 * Run this once and store the output in your .env file
 */
export function generateEncryptionKey() {
  const key = crypto.randomBytes(32).toString('hex')
  console.log('\n=== ENCRYPTION KEY ===')
  console.log('Add this to your .env file:')
  console.log(`ENCRYPTION_KEY=${key}`)
  console.log('======================\n')
  return key
}
