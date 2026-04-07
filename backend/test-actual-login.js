// Test login with actual credentials
require('dotenv').config();
const User = require('./src/models/User');
const AdminUser = require('./src/models/AdminUser');
const bcrypt = require('bcryptjs');

async function testActualLogin() {
  try {
    console.log('\n=== TESTING ACTUAL LOGIN ===\n');
    
    const email = 'marona98@gmail.com';
    const password = 'Marona08';

    console.log('1. Searching for user with email:', email);
    
    // Try admin first (as the login controller does)
    let user = await AdminUser.findByEmail(email);
    let isAdmin = true;
    console.log('   AdminUser.findByEmail result:', user ? 'FOUND' : 'NOT FOUND');

    if (!user) {
      user = await User.findByEmail(email);
      isAdmin = false;
      console.log('   User.findByEmail result:', user ? 'FOUND' : 'NOT FOUND');
    }

    if (!user) {
      console.log('\n❌ FAILED: No user found with email:', email);
      return;
    }

    console.log('\n2. User details:');
    console.log('   isAdmin:', isAdmin);
    console.log('   User ID:', isAdmin ? user.adminUserID : user.userID);
    console.log('   Email:', user.email);
    console.log('   Username:', user.username);
    console.log('   Has password_hash:', !!user.password_hash);
    console.log('   is_active:', user.is_active);

    console.log('\n3. Testing password verification...');
    console.log('   Input password:', password);
    console.log('   Stored hash (first 30 chars):', user.password_hash?.substring(0, 30) + '...');

    const isPasswordValid = isAdmin
      ? await AdminUser.verifyPassword(password, user.password_hash)
      : await User.verifyPassword(password, user.password_hash);

    console.log('   Password valid:', isPasswordValid);

    if (!isPasswordValid) {
      console.log('\n❌ FAILED: Password verification failed!');
      console.log('\n   Let\'s test bcrypt.compare directly...');
      const directTest = await bcrypt.compare(password, user.password_hash);
      console.log('   bcrypt.compare result:', directTest);
    } else {
      console.log('\n✅ SUCCESS: Login would work!');
    }

    console.log('\n=== TEST COMPLETE ===\n');
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    process.exit(0);
  }
}

testActualLogin();
