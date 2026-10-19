const express = require('express');
const Appointment = require('../models/Appointment');
const Prescription = require('../models/Prescription');
const User = require('../models/User');

const router = express.Router();

const cleanMedicalItems = (val) => {
  if (!val) return [];
  const arr = Array.isArray(val) ? val : String(val).split(",");
  return arr
    .map(s => (typeof s === "string" ? s.trim() : ""))
    .filter(s => s && !["none", "none reported", "nil", "n/a", "no", "null"].includes(s.toLowerCase()));
};


// 1. Get Doctor's Real Appointments from MongoDB
router.get('/:doctorId/appointments', async (req, res) => {
  try {
    const { doctorId } = req.params;

    // NO SEED / DUMMY DATA. Fetch only real appointments booked for this doctor.
    // Populate patientId to access the LIVE, updated medical profile directly from the Patient User record.
    const appointments = await Appointment.find({ doctorId })
      .populate('patientId', 'name email phone patientProfile')
      .populate('prescriptionId')
      .sort({ scheduledStartTime: 1 });

    const formattedAppointments = appointments.map((appt) => {
      const p = appt.patientId;
      const prof = p?.patientProfile || {};

      const rawAllergies = (prof.allergies !== undefined && prof.allergies !== null) ? prof.allergies : appt.allergies;
      const rawConditions = (prof.chronicConditions !== undefined && prof.chronicConditions !== null) ? prof.chronicConditions : appt.chronicConditions;

      const liveAllergies = cleanMedicalItems(rawAllergies);
      const liveConditions = cleanMedicalItems(rawConditions);

      return {
        _id: appt._id,
        doctorId: appt.doctorId,
        patientId: p?._id || appt.patientId,
        patientName: p?.name || appt.patientName,
        patientEmail: p?.email || appt.patientEmail,
        patientPhone: p?.phone || appt.patientPhone,
        patientAge: prof.age || appt.patientAge || null,
        patientGender: prof.gender || appt.patientGender || null,
        patientBloodGroup: prof.bloodGroup || appt.patientBloodGroup || null,
        allergies: liveAllergies,
        chronicConditions: liveConditions,
        emergencyContact: prof.emergencyContact || null,
        city: prof.city || '',
        state: prof.state || '',
        symptoms: appt.symptoms,
        scheduledStartTime: appt.scheduledStartTime,
        scheduledEndTime: appt.scheduledEndTime,
        status: appt.status,
        chatRoomId: appt.chatRoomId,
        prescriptionId: appt.prescriptionId,
        isEmergency: Boolean(appt.isEmergency),
        emergencyCategory: appt.emergencyCategory || "",
        emergencyLocation: appt.emergencyLocation || "",
        createdAt: appt.createdAt
      };
    });

    return res.status(200).json({
      success: true,
      appointments: formattedAppointments
    });
  } catch (error) {
    console.error('Error fetching doctor appointments:', error);
    return res.status(500).json({ success: false, message: 'Server error loading appointments' });
  }
});

// 2. Submit Prescription
router.post('/prescriptions', async (req, res) => {
  try {
    const { 
      appointmentId, 
      doctorId, 
      doctorName, 
      patientName, 
      diagnosis, 
      medications, 
      doctorAdvice, 
      nextFollowUpDate 
    } = req.body;

    if (!appointmentId || !doctorId || !diagnosis || !medications || medications.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please provide clinical diagnosis and at least one medication.' 
      });
    }

    const prescription = new Prescription({
      appointmentId,
      doctorId,
      doctorName,
      patientName,
      diagnosis: diagnosis.trim(),
      medications,
      doctorAdvice: doctorAdvice ? doctorAdvice.trim() : 'Follow dosage instructions as directed.',
      nextFollowUpDate: nextFollowUpDate ? nextFollowUpDate.trim() : 'As advised'
    });

    const savedPrescription = await prescription.save();

    // Mark appointment as COMPLETED
    await Appointment.findByIdAndUpdate(appointmentId, {
      status: 'COMPLETED',
      prescriptionId: savedPrescription._id
    });

    console.log(`[MediLink DB] Prescription Issued: ID ${savedPrescription._id} for ${patientName}`);

    return res.status(201).json({
      success: true,
      message: 'Prescription issued successfully and report generated.',
      prescription: savedPrescription
    });
  } catch (error) {
    console.error('Error creating prescription:', error);
    return res.status(500).json({ success: false, message: 'Server error issuing prescription' });
  }
});

// 3. Get Doctor's Issued Prescriptions Archive
router.get('/:doctorId/prescriptions', async (req, res) => {
  try {
    const { doctorId } = req.params;
    const prescriptions = await Prescription.find({ doctorId }).sort({ issuedAt: -1 });
    return res.status(200).json({
      success: true,
      prescriptions
    });
  } catch (error) {
    console.error('Error fetching prescriptions:', error);
    return res.status(500).json({ success: false, message: 'Server error loading prescriptions' });
  }
});

// 4. Toggle Emergency Duty
router.patch('/:doctorId/duty', async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { isOnline } = req.body;

    const doctor = await User.findById(doctorId);
    if (!doctor) {
      return res.status(404).json({ success: false, message: 'Doctor not found' });
    }

    doctor.doctorProfile.isOnline = Boolean(isOnline);
    await doctor.save();

    return res.status(200).json({
      success: true,
      isOnline: doctor.doctorProfile.isOnline
    });
  } catch (error) {
    console.error('Error toggling duty status:', error);
    return res.status(500).json({ success: false, message: 'Server error updating duty status' });
  }
});

module.exports = router;
