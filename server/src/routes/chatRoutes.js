const express = require("express");
const Message = require("../models/Message");
const Appointment = require("../models/Appointment");

const router = express.Router();

// 1. Get Message History for an Appointment
router.get("/:appointmentId/messages", async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const messages = await Message.find({ appointmentId }).sort({ createdAt: 1 });
    return res.status(200).json({ success: true, messages });
  } catch (error) {
    console.error("Error fetching chat messages:", error);
    return res.status(500).json({ success: false, message: "Error loading chat history" });
  }
});

// 2. Fallback POST Message
router.post("/:appointmentId/messages", async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { chatRoomId, senderRole, senderName, text } = req.body;

    if (!text || !senderRole || !senderName) {
      return res.status(400).json({ success: false, message: "Missing required message fields" });
    }

    const message = new Message({
      appointmentId,
      chatRoomId: chatRoomId || "default-room",
      senderRole,
      senderName,
      text: text.trim()
    });

    const saved = await message.save();
    return res.status(201).json({ success: true, message: saved });
  } catch (error) {
    console.error("Error creating chat message:", error);
    return res.status(500).json({ success: false, message: "Error sending message" });
  }
});

module.exports = router;
