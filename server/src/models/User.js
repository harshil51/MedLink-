const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: { 
      type: String, 
      required: [true, 'Full name is required'],
      trim: true 
    },
    email: { 
      type: String, 
      required: [true, 'Email is required'], 
      unique: true, 
      lowercase: true, 
      trim: true 
    },
    passwordHash: { 
      type: String, 
      required: [true, 'Password is required'] 
    },
    role: { 
      type: String, 
      enum: ['PATIENT', 'DOCTOR', 'ADMIN'], 
      required: true 
    },
    phone: { 
      type: String, 
      required: [true, 'Phone number is required'],
      trim: true 
    },
    avatarUrl: { 
      type: String, 
      default: '' 
    },
    patientProfile: {
      age: { type: Number, default: null },
      gender: { type: String, default: "" },
      bloodGroup: { type: String, default: "" },
      allergies: { type: [String], default: [] },
      chronicConditions: { type: [String], default: [] },
      city: { type: String, default: "" },
      state: { type: String, default: "" },
      emergencyContact: {
        name: { type: String, default: "" },
        phone: { type: String, default: "" },
        relation: { type: String, default: "" }
      }
    },
    doctorProfile: {
      specialization: { 
        type: String, 
        required: function() { return this.role === 'DOCTOR'; } 
      },
      licenseNumber: { 
        type: String, 
        required: function() { return this.role === 'DOCTOR'; } 
      },
      yearsOfExperience: { 
        type: Number, 
        default: 0 
      },
      qualification: { 
        type: String, 
        default: 'MBBS' 
      },
      hospitalAffiliation: { 
        type: String, 
        default: '' 
      },
      certificates: [
        {
          documentName: { type: String },
          fileUrl: { type: String },
          uploadedAt: { type: Date, default: Date.now }
        }
      ],
      verificationStatus: { 
        type: String, 
        enum: ['PENDING', 'APPROVED', 'REJECTED'], 
        default: 'PENDING' 
      },
      rejectionReason: { 
        type: String, 
        default: '' 
      },
      isOnline: { 
        type: Boolean, 
        default: false 
      },
      isBusy: { 
        type: Boolean, 
        default: false 
      },
      lastEmergencyHandledAt: { 
        type: Date, 
        default: null 
      }
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
