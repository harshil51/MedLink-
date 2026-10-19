const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Appointment",
      required: true,
      index: true
    },
    chatRoomId: {
      type: String,
      required: true,
      index: true
    },
    senderRole: {
      type: String,
      enum: ["DOCTOR", "PATIENT", "SYSTEM"],
      required: true
    },
    senderName: {
      type: String,
      required: true
    },
    text: {
      type: String,
      required: true,
      trim: true
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Message", messageSchema);
