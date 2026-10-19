const express = require('express');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const User = require('../models/User');

const router = express.Router();

// Multer storage configuration for registration certificates
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/certificates');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'cert-' + uniqueSuffix + ext);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Doctor Registration Endpoint with Certificate File Upload
router.post('/doctor/register', upload.single('certificate'), async (req, res) => {
  try {
    const { 
      name, 
      email, 
      password, 
      phone, 
      specialization, 
      licenseNumber, 
      yearsOfExperience, 
      qualification, 
      hospitalAffiliation 
    } = req.body;

    // Validate required fields
    if (!name || !email || !password || !phone || !specialization || !licenseNumber) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please provide all mandatory fields (Full Name, Email, Password, Phone, Specialization, Medical License Number).' 
      });
    }

    // Check if email already registered
    const existingEmail = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingEmail) {
      return res.status(409).json({ 
        success: false, 
        message: 'An account with this email address is already registered in India.' 
      });
    }

    // Check if license number already used
    const existingLicense = await User.findOne({ 
      role: 'DOCTOR', 
      'doctorProfile.licenseNumber': licenseNumber.trim() 
    });
    if (existingLicense) {
      return res.status(409).json({ 
        success: false, 
        message: 'A doctor with this Medical License / Reg. Number is already registered.' 
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Prepare certificate record if uploaded
    const certificates = [];
    if (req.file) {
      certificates.push({
        documentName: req.file.originalname,
        fileUrl: `/uploads/certificates/${req.file.filename}`,
        uploadedAt: new Date()
      });
    }

    // Create doctor document
    const doctor = new User({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      passwordHash,
      role: 'DOCTOR',
      phone: phone.trim(),
      doctorProfile: {
        specialization: specialization.trim(),
        licenseNumber: licenseNumber.trim(),
        yearsOfExperience: Number(yearsOfExperience) || 0,
        qualification: qualification ? qualification.trim() : 'MBBS',
        hospitalAffiliation: hospitalAffiliation ? hospitalAffiliation.trim() : '',
        certificates,
        verificationStatus: 'PENDING',
        isOnline: false,
        isBusy: false
      }
    });

    const savedDoctor = await doctor.save();

    console.log(`[MediLink DB] New Doctor Registered: ${savedDoctor.name} (${savedDoctor.email}) | License: ${savedDoctor.doctorProfile.licenseNumber} | Cert: ${req.file ? req.file.originalname : 'None'}`);

    return res.status(201).json({
      success: true,
      message: 'Registration successful! Your credentials have been submitted for admin review.',
      doctor: {
        id: savedDoctor._id,
        name: savedDoctor.name,
        email: savedDoctor.email,
        phone: savedDoctor.phone,
        specialization: savedDoctor.doctorProfile.specialization,
        licenseNumber: savedDoctor.doctorProfile.licenseNumber,
        qualification: savedDoctor.doctorProfile.qualification,
        hospitalAffiliation: savedDoctor.doctorProfile.hospitalAffiliation,
        certificateName: req.file ? req.file.originalname : null,
        verificationStatus: savedDoctor.doctorProfile.verificationStatus,
        createdAt: savedDoctor.createdAt
      }
    });
  } catch (error) {
    console.error('Doctor registration error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Server error during registration. Please try again later.',
      error: error.message 
    });
  }
});

// Doctor Login Endpoint
router.post('/doctor/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please provide both email and password.' 
      });
    }

    const doctor = await User.findOne({ email: email.toLowerCase().trim(), role: 'DOCTOR' });
    if (!doctor) {
      return res.status(401).json({ 
        success: false, 
        message: 'No doctor profile found with this email address.' 
      });
    }

    const isMatch = await bcrypt.compare(password, doctor.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid password. Please verify your credentials.' 
      });
    }

    // Check Verification Status
    const status = doctor.doctorProfile?.verificationStatus;
    if (status === 'PENDING') {
      return res.status(403).json({
        success: false,
        status: 'PENDING',
        message: 'Your registration is currently under review by the Hospital Administration. You will be notified once approved.'
      });
    }

    if (status === 'REJECTED') {
      return res.status(403).json({
        success: false,
        status: 'REJECTED',
        message: `Your registration was not approved. Reason: ${doctor.doctorProfile?.rejectionReason || 'Contact medical administration.'}`
      });
    }

    return res.status(200).json({
      success: true,
      status: 'APPROVED',
      message: 'Doctor authenticated successfully.',
      doctor: {
        id: doctor._id,
        _id: doctor._id,
        name: doctor.name,
        email: doctor.email,
        phone: doctor.phone,
        specialization: doctor.doctorProfile?.specialization,
        doctorProfile: doctor.doctorProfile
      }
    });
  } catch (error) {
    console.error('Doctor login error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Server error during login.',
      error: error.message 
    });
  }
});

module.exports = router;

// ----------------- PATIENT AUTHENTICATION ROUTES -----------------

// Patient Registration Endpoint
router.post('/patient/register', async (req, res) => {
  try {
    const { 
      name, 
      email, 
      password, 
      phone, 
      age, 
      gender, 
      bloodGroup, 
      allergies, 
      chronicConditions, 
      city, 
      state,
      emergencyContactName,
      emergencyContactPhone,
      emergencyContactRelation
    } = req.body;

    if (!name || !email || !password || !phone) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please provide all mandatory fields (Full Name, Email, Password, Contact Phone).' 
      });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(409).json({ 
        success: false, 
        message: 'An account with this email address already exists. Please sign in.' 
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const cleanMedicalItems = (val) => {
      if (!val) return [];
      const arr = Array.isArray(val) ? val : val.split(",");
      return arr
        .map(s => (typeof s === "string" ? s.trim() : ""))
        .filter(s => s && !["none", "none reported", "nil", "n/a", "no"].includes(s.toLowerCase()));
    };

    const parsedAllergies = cleanMedicalItems(allergies);
    const parsedConditions = cleanMedicalItems(chronicConditions);

    const patient = new User({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      passwordHash,
      role: "PATIENT",
      phone: phone.trim(),
      patientProfile: {
        age: age ? Number(age) : null,
        gender: gender ? gender.trim() : "",
        bloodGroup: bloodGroup ? bloodGroup.trim() : "",
        allergies: parsedAllergies,
        chronicConditions: parsedConditions,
        city: city ? city.trim() : "",
        state: state ? state.trim() : "",
        emergencyContact: {
          name: emergencyContactName ? emergencyContactName.trim() : "",
          phone: emergencyContactPhone ? emergencyContactPhone.trim() : "",
          relation: emergencyContactRelation ? emergencyContactRelation.trim() : ""
        }
      }
    });

    const savedPatient = await patient.save();

    console.log(`[MediLink DB] New Patient Registered: ${savedPatient.name} (${savedPatient.email}) - Instant Access Granted`);

    return res.status(201).json({
      success: true,
      message: 'Patient account created successfully.',
      patient: {
        id: savedPatient._id,
        _id: savedPatient._id,
        name: savedPatient.name,
        email: savedPatient.email,
        phone: savedPatient.phone,
        role: savedPatient.role,
        patientProfile: savedPatient.patientProfile
      }
    });
  } catch (error) {
    console.error('Patient registration error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Server error during patient registration.',
      error: error.message 
    });
  }
});

// Patient Login Endpoint
router.post('/patient/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please provide both email and password.' 
      });
    }

    const patient = await User.findOne({ email: email.toLowerCase().trim(), role: 'PATIENT' });
    if (!patient) {
      return res.status(401).json({ 
        success: false, 
        message: 'No patient account found with this email. Please register.' 
      });
    }

    const isMatch = await bcrypt.compare(password, patient.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid password. Please check your credentials.' 
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Patient authenticated successfully.',
      patient: {
        id: patient._id,
        _id: patient._id,
        name: patient.name,
        email: patient.email,
        phone: patient.phone,
        role: patient.role,
        patientProfile: patient.patientProfile
      }
    });
  } catch (error) {
    console.error('Patient login error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Server error during patient login.',
      error: error.message 
    });
  }
});
