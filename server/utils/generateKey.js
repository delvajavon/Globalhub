#!/usr/bin/env node

/**
 * Generate a secure encryption key for GlobalHub
 * Run this once and add the output to your .env file
 */

import { generateEncryptionKey } from './encryption.js'

console.log('\n🔐 Generating secure encryption key...\n')

generateEncryptionKey()

console.log('⚠️  IMPORTANT: Store this key securely!')
console.log('   - Never commit to version control')
console.log('   - Use secrets manager in production')
console.log('   - Losing this key means losing access to encrypted data\n')
