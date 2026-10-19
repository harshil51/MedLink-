const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
      index: true
    },
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
      index: true
    },
    isEmergency: {
      type: Boolean,
      default: false
    },
    emergencyCategory: {
      type: String,
      default: ""
    },
    emergencyLocation: {
      type: String,
      default: ""
    },
    patientName: {
      type: String,
      required: true
    },
    patientAge: {
      type: Number,
      default: null
    },
    patientGender: {
      type: String,
      default: ""
    },
    patientBloodGroup: {
      type: String,
      default: ""
    },
    patientPhone: {
      type: String,
      default: ""
    },
    patientEmail: {
      type: String,
      default: ""
    },
    symptoms: {
      type: String,
      default: ""
    },
    allergies: {
      type: [String],
      default: []
    },
    chronicConditions: {
      type: [String],
      default: []
    },
    scheduledStartTime: {
      type: Date,
      required: true,
      index: true
    },
    scheduledEndTime: {
      type: Date,
      required: true
    },
    status: {
      type: String,
      enum: ['BOOKED', 'PRE_REVIEW', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
      default: 'BOOKED'
    },
    chatRoomId: {
      type: String,
      default: () => 'room-' + Date.now()
    },
    prescriptionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Prescription'
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Appointment', appointmentSchema);
