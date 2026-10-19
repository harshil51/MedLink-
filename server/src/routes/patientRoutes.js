const express = require('express');
const User = require('../models/User');
const Appointment = require('../models/Appointment');
const Prescription = require('../models/Prescription');

const router = express.Router();

const cleanMedicalItems = (val) => {
  if (!val) return [];
  const arr = Array.isArray(val) ? val : String(val).split(",");
  return arr
    .map(s => (typeof s === "string" ? s.trim() : ""))
    .filter(s => s && !["none", "none reported", "nil", "n/a", "no", "null"].includes(s.toLowerCase()));
};


// 1. Get All Approved Doctors for Booking
router.get('/doctors', async (req, res) => {
  try {
    const doctors = await User.find({
      role: 'DOCTOR',
      'doctorProfile.verificationStatus': 'APPROVED'
    }).select('name email phone doctorProfile');

    return res.status(200).json({
      success: true,
      doctors
    });
  } catch (error) {
    console.error('Error fetching approved doctors:', error);
    return res.status(500).json({ success: false, message: 'Server error loading doctors' });
  }
});

// 2. Update Patient Profile (Name, Demographics, Allergies, Chronic History)
router.put('/:patientId/profile', async (req, res) => {
  try {
    const { patientId } = req.params;
    const {
      name,
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

    const patient = await User.findOne({ _id: patientId, role: 'PATIENT' });
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient record not found.' });
    }

    // Update Top Level
    if (name) patient.name = name.trim();
    if (phone) patient.phone = phone.trim();

    // Parse arrays cleanly with no dummy fallbacks
    const parsedAllergies = cleanMedicalItems(allergies);
    const parsedConditions = cleanMedicalItems(chronicConditions);

    // Update patientProfile strictly with real inputs
    if (age !== undefined) {
      patient.patientProfile.age = age ? Number(age) : null;
    }
    if (gender !== undefined) patient.patientProfile.gender = gender.trim();
    if (bloodGroup !== undefined) patient.patientProfile.bloodGroup = bloodGroup.trim();
    patient.patientProfile.allergies = parsedAllergies;
    patient.patientProfile.chronicConditions = parsedConditions;
    if (city !== undefined) patient.patientProfile.city = city.trim();
    if (state !== undefined) patient.patientProfile.state = state.trim();

    if (!patient.patientProfile.emergencyContact) {
      patient.patientProfile.emergencyContact = {};
    }
    if (emergencyContactName !== undefined) patient.patientProfile.emergencyContact.name = emergencyContactName.trim();
    if (emergencyContactPhone !== undefined) patient.patientProfile.emergencyContact.phone = emergencyContactPhone.trim();
    if (emergencyContactRelation !== undefined) patient.patientProfile.emergencyContact.relation = emergencyContactRelation.trim();

    const updatedPatient = await patient.save();

    console.log(`[MediLink DB] Patient Profile Updated for ${updatedPatient.name} (${updatedPatient.email})`);

    return res.status(200).json({
      success: true,
      message: 'Medical profile and demographics updated successfully.',
      patient: {
        id: updatedPatient._id,
        _id: updatedPatient._id,
        name: updatedPatient.name,
        email: updatedPatient.email,
        phone: updatedPatient.phone,
        role: updatedPatient.role,
        patientProfile: updatedPatient.patientProfile
      }
    });
  } catch (error) {
    console.error('Error updating patient profile:', error);
    return res.status(500).json({ success: false, message: 'Server error updating profile', error: error.message });
  }
});

// 3. Book 1-Hour Consultation Slot with Real Doctor in Database
router.post('/appointments', async (req, res) => {
  try {
    const { 
      patientId, 
      doctorId, 
      symptoms, 
      slotDate, 
      slotTime 
    } = req.body;

    if (!patientId || !doctorId || !symptoms) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please provide patient, doctor, and chief complaint / symptoms.' 
      });
    }

    // Fetch Patient Details
    const patient = await User.findById(patientId);
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found.' });
    }

    // Fetch Doctor Details
    const doctor = await User.findOne({ _id: doctorId, role: 'DOCTOR' });
    if (!doctor) {
      return res.status(404).json({ success: false, message: 'Selected doctor not found.' });
    }

    // Calculate 1-Hour Start & End Times
    // Default to today/selected date and specified slot
    let scheduledStartTime;
    if (slotDate && slotTime) {
      const [hours, minutes] = slotTime.split(':').map(Number);
      scheduledStartTime = new Date(slotDate);
      scheduledStartTime.setHours(hours || 10, minutes || 0, 0, 0);
    } else {
      // Default: starts in 5 minutes (Inside 10-minute Pre-Review window so it is immediately interactive!)
      scheduledStartTime = new Date(Date.now() + 5 * 60 * 1000);
    }

    const scheduledEndTime = new Date(scheduledStartTime.getTime() + 24 * 60 * 60 * 1000); // 24-Hour Timeline Slot for Testing

    const cleanAllergies = cleanMedicalItems(patient.patientProfile?.allergies);
    const cleanConditions = cleanMedicalItems(patient.patientProfile?.chronicConditions);

    const appointment = new Appointment({
      patientId: patient._id,
      doctorId: doctor._id,
      patientName: patient.name,
      patientAge: patient.patientProfile?.age || null,
      patientGender: patient.patientProfile?.gender || "",
      patientBloodGroup: patient.patientProfile?.bloodGroup || "",
      patientPhone: patient.phone || "",
      patientEmail: patient.email || "",
      symptoms: symptoms.trim(),
      allergies: cleanAllergies,
      chronicConditions: cleanConditions,
      scheduledStartTime,
      scheduledEndTime,
      status: 'BOOKED',
      chatRoomId: `room-${Date.now()}-${Math.floor(Math.random() * 1000)}`
    });

    const savedAppointment = await appointment.save();

    console.log(`[MediLink DB] Real Appointment Booked: Patient ${patient.name} -> Dr. ${doctor.name} at ${scheduledStartTime.toISOString()}`);

    return res.status(201).json({
      success: true,
      message: `Appointment successfully booked with Dr. ${doctor.name} for 1-hour consultation.`,
      appointment: savedAppointment
    });
  } catch (error) {
    console.error('Error booking appointment:', error);
    return res.status(500).json({ success: false, message: 'Server error booking appointment', error: error.message });
  }
});

// 4. Get All Appointments for a Patient
router.get('/:patientId/appointments', async (req, res) => {
  try {
    const { patientId } = req.params;

    const appointments = await Appointment.find({ patientId })
      .populate('doctorId', 'name email doctorProfile')
      .populate('prescriptionId')
      .sort({ scheduledStartTime: -1 });

    return res.status(200).json({
      success: true,
      appointments
    });
  } catch (error) {
    console.error('Error fetching patient appointments:', error);
    return res.status(500).json({ success: false, message: 'Server error loading appointments' });
  }
});


// 5. Patient Dispatches Emergency SOS via REST
router.post("/emergency-sos", async (req, res) => {
  try {
    const {
      patientId,
      patientName,
      patientPhone,
      emergencyCategory,
      emergencyLocation,
      symptoms,
      allergies,
      chronicConditions
    } = req.body;

    const chatRoomId = "emergency-" + Date.now() + "-" + Math.floor(Math.random() * 1000);

    const emergencyAppt = new Appointment({
      patientId: patientId && require("mongoose").Types.ObjectId.isValid(patientId) ? patientId : null,
      patientName: patientName || "Emergency SOS Caller",
      patientPhone: patientPhone || "",
      isEmergency: true,
      emergencyCategory: emergencyCategory || "Acute Trauma / Distress",
      emergencyLocation: emergencyLocation || "Location Shared Via SOS",
      symptoms: symptoms || ((emergencyCategory || "Critical Trauma") + ": Urgent medical intervention requested via SOS"),
      allergies: Array.isArray(allergies) ? allergies : [],
      chronicConditions: Array.isArray(chronicConditions) ? chronicConditions : [],
      scheduledStartTime: new Date(),
      scheduledEndTime: new Date(Date.now() + 60 * 60 * 1000),
      status: "PRE_REVIEW",
      chatRoomId
    });

    const savedAppt = await emergencyAppt.save();

    const io = req.app.get("io");
    if (io) {
      const alertPayload = {
        appointmentId: savedAppt._id,
        chatRoomId: savedAppt.chatRoomId,
        patientName: savedAppt.patientName,
        patientPhone: savedAppt.patientPhone,
        emergencyCategory: savedAppt.emergencyCategory,
        emergencyLocation: savedAppt.emergencyLocation,
        symptoms: savedAppt.symptoms,
        allergies: savedAppt.allergies,
        chronicConditions: savedAppt.chronicConditions,
        dispatchedAt: new Date()
      };
      io.to("emergency_duty_pool").emit("emergency_broadcast_alert", alertPayload);
      io.emit("emergency_incoming_global", alertPayload);
    }

    return res.status(201).json({
      success: true,
      appointmentId: savedAppt._id,
      chatRoomId: savedAppt.chatRoomId,
      message: "Emergency SOS dispatched to on-duty medical staff",
      emergencyCase: savedAppt
    });
  } catch (error) {
    console.error("Emergency SOS REST Error:", error);
    return res.status(500).json({ success: false, message: "Emergency dispatch failed" });
  }
});

module.exports = router;

