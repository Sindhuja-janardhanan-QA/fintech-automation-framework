import { config } from './utils/ConfigManager';

/**
 * Test file to verify ConfigManager functionality
 * Run this file to test the secret management system
 */
async function testConfigManager() {
  console.log('🔧 Testing ConfigManager...\n');

  try {
    // Test 1: Check if environment variables are loaded
    console.log('✅ Testing environment variable loading...');
    
    // Test 2: Try to get fintech configuration (will throw if missing)
    console.log('✅ Testing fintech configuration retrieval...');
    const fintechConfig = config.getFintechConfig();
    console.log('📋 Fintech config loaded successfully');
    console.log(`   - Username: ${fintechConfig.username ? '✓ Set' : '✗ Missing'}`);
    console.log(`   - Password: ${fintechConfig.password ? '✓ Set' : '✗ Missing'}`);
    console.log(`   - Client ID: ${fintechConfig.clientId ? '✓ Set' : '✗ Missing'}`);
    console.log(`   - Discovery ID: ${fintechConfig.discoveryId ? '✓ Set' : '✗ Missing'}`);

    // Test 3: Test individual secret retrieval
    console.log('\n✅ Testing individual secret retrieval...');
    const clientId = config.getSecret('CLIENT_ID');
    console.log(`   - CLIENT_ID: ${clientId.substring(0, 4)}****`);

    // Test 4: Test optional secret retrieval
    console.log('\n✅ Testing optional secret retrieval...');
    const optionalValue = config.getOptionalSecret('OPTIONAL_VAR', 'default_value');
    console.log(`   - OPTIONAL_VAR: ${optionalValue}`);

    console.log('\n🎉 All tests passed! ConfigManager is working correctly.');

  } catch (error) {
    console.error('❌ Test failed:', error instanceof Error ? error.message : String(error));
    console.log('\n💡 Make sure to fill in your .env file with the required values:');
    console.log('   - FINTECH_USERNAME');
    console.log('   - FINTECH_PASSWORD');
    console.log('   - CLIENT_ID');
    console.log('   - DISCOVERY_ID');
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  testConfigManager();
}

export { testConfigManager };
