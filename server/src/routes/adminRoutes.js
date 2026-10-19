const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

const router = express.Router();

// Admin Login Endpoint
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please provide both admin email and password.' 
      });
    }

    // Find user with role ADMIN
    const admin = await User.findOne({ 
      email: email.toLowerCase().trim(), 
      role: 'ADMIN' 
    });

    if (!admin) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid administrative credentials.' 
      });
    }

    const isMatch = await bcrypt.compare(password, admin.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid administrative password.' 
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Admin authenticated successfully.',
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role
      }
    });
  } catch (error) {
    console.error('Admin login error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Server error during admin authentication.', 
      error: error.message 
    });
  }
});

// Get All Doctors (Pending and Approved)
router.get('/doctors', async (req, res) => {
  try {
    const pendingDoctors = await User.find({ 
      role: 'DOCTOR', 
      'doctorProfile.verificationStatus': 'PENDING' 
    }).sort({ createdAt: -1 });

    const activeDoctors = await User.find({ 
      role: 'DOCTOR', 
      'doctorProfile.verificationStatus': 'APPROVED' 
    }).sort({ updatedAt: -1 });

    return res.status(200).json({
      success: true,
      pendingDoctors,
      activeDoctors
    });
  } catch (error) {
    console.error('Fetch doctors error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Server error fetching doctors list.', 
      error: error.message 
    });
  }
});

// Approve Doctor by ID
router.patch('/doctors/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;

    const doctor = await User.findOne({ _id: id, role: 'DOCTOR' });
    if (!doctor) {
      return res.status(404).json({ 
        success: false, 
        message: 'Doctor not found.' 
      });
    }

    doctor.doctorProfile.verificationStatus = 'APPROVED';
    doctor.doctorProfile.rejectionReason = '';
    await doctor.save();

    console.log(`[MediLink DB] Doctor Approved by Admin: ${doctor.name} (${doctor.email})`);

    return res.status(200).json({
      success: true,
      message: `Dr. ${doctor.name} has been approved successfully. They can now log in.`,
      doctor
    });
  } catch (error) {
    console.error('Approve doctor error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Server error approving doctor.', 
      error: error.message 
    });
  }
});

module.exports = router;

// Delete Doctor by ID
router.delete('/doctors/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const doctor = await User.findOne({ _id: id, role: 'DOCTOR' });
    if (!doctor) {
      return res.status(404).json({ 
        success: false, 
        message: 'Doctor not found.' 
      });
    }

    const doctorName = doctor.name;
    await User.findByIdAndDelete(id);

    console.log(`[MediLink DB] Doctor Deleted by Admin: ${doctorName} (ID: ${id})`);

    return res.status(200).json({
      success: true,
      message: `Dr. ${doctorName} has been permanently deleted from the system.`
    });
  } catch (error) {
    console.error('Delete doctor error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Server error deleting doctor.', 
      error: error.message 
    });
  }
});
