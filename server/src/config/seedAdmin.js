const bcrypt = require('bcryptjs');
const User = require('../models/User');

const seedAdmin = async () => {
  try {
    const adminExists = await User.findOne({ role: 'ADMIN' });
    if (!adminExists) {
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash('Admin@123', salt);

      const admin = new User({
        name: 'MediLink Hospital Administrator',
        email: 'admin@medilink.in',
        passwordHash,
        role: 'ADMIN',
        phone: '+91 99999 88888'
      });

      await admin.save();
      console.log('[MediLink DB] Seeded default Admin account: admin@medilink.in / Admin@123');
    }
  } catch (error) {
    console.error('Error seeding admin user:', error.message);
  }
};

module.exports = seedAdmin;
