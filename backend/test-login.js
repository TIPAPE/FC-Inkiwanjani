// Test login flow
require('dotenv').config();
const User = require('./src/models/User');
const AdminUser = require('./src/models/AdminUser');
const bcrypt = require('bcryptjs');

async function testLogin() {
  try {
    console.log('\n=== TESTING LOGIN FLOW ===\n');

    // Test 1: Check if we can find users in the database
    console.log('1. Checking for users in database...');
    
    // Check admin_users table
    const [adminRows] = await require('./src/config/database').execute('SELECT * FROM admin_users');
    console.log(`   Found ${adminRows.length} admin user(s):`);
    adminRows.forEach(admin => {
      console.log(`   - ID: ${admin.adminUserID}, Email: ${admin.email}, Username: ${admin.username}, Active: ${admin.is_active}`);
    });

    // Check users table
    const [userRows] = await require('./src/config/database').execute('SELECT * FROM users');
    console.log(`\n   Found ${userRows.length} regular user(s):`);
    userRows.forEach(user => {
      console.log(`   - ID: ${user.userID}, Email: ${user.email}, Username: ${user.username}, Active: ${user.is_active}`);
    });

    // Test 2: Test findByEmail for a specific user
    if (adminRows.length > 0) {
      const testEmail = adminRows[0].email;
      console.log(`\n2. Testing AdminUser.findByEmail('${testEmail}')...`);
      const admin = await AdminUser.findByEmail(testEmail);
      if (admin) {
        console.log('   ✅ Admin found:', {
          id: admin.adminUserID,
          email: admin.email,
          username: admin.username,
          hasPasswordHash: !!admin.password_hash
        });
        
        // Test 3: Test password verification
        console.log('\n3. Testing password verification...');
        console.log('   Note: We cannot test actual password without knowing it');
        console.log('   Password hash starts with:', admin.password_hash?.substring(0, 20) + '...');
        
        // Test bcrypt
        const testPassword = 'testpassword123';
        const hashed = await bcrypt.hash(testPassword, 10);
        const isValid = await bcrypt.compare(testPassword, hashed);
        console.log(`   ✅ Bcrypt test: "${testPassword}" matches generated hash: ${isValid}`);
      } else {
        console.log('   ❌ Admin not found!');
      }
    }

    if (userRows.length > 0) {
      const testEmail = userRows[0].email;
      console.log(`\n4. Testing User.findByEmail('${testEmail}')...`);
      const user = await User.findByEmail(testEmail);
      if (user) {
        console.log('   ✅ User found:', {
          id: user.userID,
          email: user.email,
          username: user.username,
          hasPasswordHash: !!user.password_hash
        });
      } else {
        console.log('   ❌ User not found!');
      }
    }

    console.log('\n=== TEST COMPLETE ===\n');
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    process.exit(0);
  }
}

testLogin();
