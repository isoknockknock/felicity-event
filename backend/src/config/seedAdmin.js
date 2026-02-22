const bcrypt = require("bcrypt");
const Admin = require("../models/Admin.model");

const seedAdmin = async () => {
  try {
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminEmail || !adminPassword) {
      console.warn("Admin credentials not set in .env");
      return;
    }

    const existingAdmin = await Admin.findOne({ email: adminEmail });
    if (existingAdmin) {
      console.log("Admin already exists");
      return;
    }

    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    await Admin.create({
      email: adminEmail,
      password: hashedPassword
    });

    console.log("Admin account seeded successfully");
  } catch (err) {
    console.error("Failed to seed admin:", err.message);
  }
};

module.exports = seedAdmin;
