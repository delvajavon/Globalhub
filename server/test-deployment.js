#!/usr/bin/env node

/**
 * Test script for deployment system
 * Tests encryption utilities (worker tests require Supabase DB setup)
 */

import dotenv from 'dotenv'
import { encryptCredential, decryptCredential, testEncryption } from './utils/encryption.js'

// Load environment variables
dotenv.config()

console.log('\n🧪 GlobalHub Deployment System Tests\n')
console.log('=' .repeat(50))

// Test 1: Encryption
console.log('\n[Test 1] Encryption Utilities')
console.log('-'.repeat(50))

const encryptionTestResult = testEncryption()
if (encryptionTestResult) {
  console.log('✅ Encryption test passed')
} else {
  console.log('❌ Encryption test failed')
  process.exit(1)
}

// Test 2: Encrypt/decrypt WordPress credentials
console.log('\n[Test 2] WordPress Credentials Encryption')
console.log('-'.repeat(50))

try {
  const wordpressCredential = 'admin:wp_app_password_123'
  const encrypted = encryptCredential(wordpressCredential)
  console.log(`Original:  ${wordpressCredential}`)
  console.log(`Encrypted: ${encrypted.substring(0, 50)}...`)
  
  const decrypted = decryptCredential(encrypted)
  console.log(`Decrypted: ${decrypted}`)
  
  if (decrypted === wordpressCredential) {
    console.log('✅ WordPress credential encryption successful')
  } else {
    console.log('❌ Decryption mismatch')
    process.exit(1)
  }
} catch (error) {
  console.log(`❌ WordPress encryption failed: ${error.message}`)
  process.exit(1)
}

// Test 3: Encrypt/decrypt Ghost credentials
console.log('\n[Test 3] Ghost Credentials Encryption')
console.log('-'.repeat(50))

try {
  const ghostCredential = '507f1f77bcf86cd799439011:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'
  const encrypted = encryptCredential(ghostCredential)
  console.log(`Original:  ${ghostCredential.substring(0, 50)}...`)
  console.log(`Encrypted: ${encrypted.substring(0, 50)}...`)
  
  const decrypted = decryptCredential(encrypted)
  console.log(`Decrypted: ${decrypted.substring(0, 50)}...`)
  
  if (decrypted === ghostCredential) {
    console.log('✅ Ghost credential encryption successful')
  } else {
    console.log('❌ Decryption mismatch')
    process.exit(1)
  }
} catch (error) {
  console.log(`❌ Ghost encryption failed: ${error.message}`)
  process.exit(1)
}

console.log('\n' + '='.repeat(50))
console.log('✅ All encryption tests passed\n')

// Show encryption key status
console.log('📋 Environment Status:')
console.log('-'.repeat(50))
if (process.env.ENCRYPTION_KEY) {
  console.log('✅ ENCRYPTION_KEY is set')
} else {
  console.log('⚠️  ENCRYPTION_KEY not set (using default dev key)')
  console.log('   Generate one with: node utils/generateKey.js')
}

if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
  console.log('✅ Supabase credentials configured')
} else {
  console.log('❌ Supabase credentials missing')
}

console.log('')
