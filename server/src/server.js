const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const pathPosix = require("path");
const connectDB = require("./config/db");
const seedAdmin = require("./config/seedAdmin");
const authRoutes = require("./routes/authRoutes");
const adminRoutes = require("./routes/adminRoutes");
const doctorRoutes = require("./routes/doctorRoutes");
const patientRoutes = require("./routes/patientRoutes");
const chatRoutes = require("./routes/chatRoutes");
const Appointment = require("./models/Appointment");
const Message = require("./models/Message");

dotenv.config();

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5001;

// Socket.io Setup with CORS
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PATCH", "PUT"]
  }
});

// Real-Time Active Room Presence Maps
// activeDoctorRooms: Map<chatRoomId, { doctorName, doctorId, socketId, joinedAt }>
// activePatientRooms: Map<chatRoomId, { patientName, patientId, socketId, joinedAt }>
const activeDoctorRooms = new Map();
const activePatientRooms = new Map();
// Emergency On-Duty Doctors Pool: Map<doctorId, { doctorId, doctorName, socketId } >
const onDutyDoctors = new Map();

app.set("io", io);

io.on("connection", (socket) => {
  console.log(`[MediLink Socket] Client connected: ${socket.id}`);

  // 1. User Joins Room (Doctor or Patient)
  socket.on("join_room", async ({ chatRoomId, appointmentId, userRole, userName, userId }) => {
    if (!chatRoomId) return;

    socket.join(chatRoomId);
    socket.data = { chatRoomId, appointmentId, userRole, userName, userId };

    console.log(`[MediLink Socket] ${userRole} "${userName}" joined room "${chatRoomId}"`);

    if (userRole === "DOCTOR") {
      activeDoctorRooms.set(chatRoomId, {
        doctorName: userName,
        doctorId: userId,
        socketId: socket.id,
        joinedAt: new Date()
      });

      // Update Appointment in MongoDB to IN_PROGRESS
      if (appointmentId && mongoose.Types.ObjectId.isValid(appointmentId)) {
        try {
          await Appointment.findByIdAndUpdate(appointmentId, { status: "IN_PROGRESS" });
        } catch (e) {
          console.error("Error updating appointment status:", e);
        }
      }

      // Notify everyone in this room that doctor is online
      io.to(chatRoomId).emit("doctor_presence", {
        online: true,
        doctorName: userName,
        joinedAt: new Date()
      });

      // If the patient is already in this room, immediately tell the doctor!
      if (activePatientRooms.has(chatRoomId)) {
        const patientData = activePatientRooms.get(chatRoomId);
        socket.emit("patient_presence", {
          online: true,
          patientName: patientData.patientName
        });
      }

      // Broadcast globally to all patients (for floating banner & chimes)
      io.emit("doctor_entered_consultation", {
        appointmentId,
        chatRoomId,
        doctorName: userName
      });
    } else if (userRole === "PATIENT") {
      activePatientRooms.set(chatRoomId, {
        patientName: userName,
        patientId: userId,
        socketId: socket.id,
        joinedAt: new Date()
      });

      // Notify everyone in this room that patient is online
      io.to(chatRoomId).emit("patient_presence", {
        online: true,
        patientName: userName
      });

      // If doctor is already in this room, immediately tell the patient!
      if (activeDoctorRooms.has(chatRoomId)) {
        const docData = activeDoctorRooms.get(chatRoomId);
        socket.emit("doctor_presence", {
          online: true,
          doctorName: docData.doctorName,
          joinedAt: docData.joinedAt
        });
      }
    }
  });

  // 2. Query Doctor Status
  socket.on("check_doctor_status", ({ chatRoomId }) => {
    if (!chatRoomId) return;
    const isOnline = activeDoctorRooms.has(chatRoomId);
    const docData = activeDoctorRooms.get(chatRoomId) || null;
    socket.emit("doctor_presence", {
      online: isOnline,
      doctorName: docData?.doctorName || "",
      joinedAt: docData?.joinedAt || null
    });
  });

  // 3. Query Patient Status
  socket.on("check_patient_status", ({ chatRoomId }) => {
    if (!chatRoomId) return;
    const isOnline = activePatientRooms.has(chatRoomId);
    const pData = activePatientRooms.get(chatRoomId) || null;
    socket.emit("patient_presence", {
      online: isOnline,
      patientName: pData?.patientName || ""
    });
  });

  // 4. Real-Time Chat Message
  socket.on("send_message", async ({ chatRoomId, appointmentId, senderRole, senderName, text }) => {
    if (!chatRoomId || !text || !text.trim()) return;

    try {
      let savedMsg = {
        _id: new mongoose.Types.ObjectId(),
        appointmentId: appointmentId || null,
        chatRoomId,
        senderRole,
        senderName,
        text: text.trim(),
        createdAt: new Date()
      };

      if (appointmentId && mongoose.Types.ObjectId.isValid(appointmentId)) {
        const msgDoc = new Message({
          appointmentId,
          chatRoomId,
          senderRole,
          senderName,
          text: text.trim()
        });
        savedMsg = await msgDoc.save();
      }

      // Broadcast message to everyone in the room
      io.to(chatRoomId).emit("receive_message", {
        _id: savedMsg._id,
        appointmentId: savedMsg.appointmentId,
        chatRoomId: savedMsg.chatRoomId,
        senderRole: savedMsg.senderRole,
        senderName: savedMsg.senderName,
        text: savedMsg.text,
        createdAt: savedMsg.createdAt
      });
    } catch (err) {
      console.error("Error saving/emitting chat message:", err);
    }
  });

  // 5. Typing Indicator
  socket.on("typing", ({ chatRoomId, senderName, senderRole, isTyping }) => {
    if (!chatRoomId) return;
    socket.to(chatRoomId).emit("user_typing", {
      senderName,
      senderRole,
      isTyping
    });
  });

  // 6. Leave Room
  socket.on("leave_room", ({ chatRoomId, userRole }) => {
    if (!chatRoomId) return;
    if (userRole === "DOCTOR") {
      activeDoctorRooms.delete(chatRoomId);
      io.to(chatRoomId).emit("doctor_presence", { online: false });
    } else if (userRole === "PATIENT") {
      activePatientRooms.delete(chatRoomId);
      io.to(chatRoomId).emit("patient_presence", { online: false });
    }
    socket.leave(chatRoomId);
  });


  // 8. Register Doctor on Emergency Duty
  socket.on("register_doctor_duty", ({ doctorId, doctorName, isDuty }) => {
    if (!doctorId) return;
    if (isDuty) {
      onDutyDoctors.set(doctorId, { doctorId, doctorName, socketId: socket.id });
      socket.join("emergency_duty_pool");
      console.log("[MediLink Emergency] 🚨 Dr. " + doctorName + " joined Emergency Duty Pool (Total: " + onDutyDoctors.size + ")");
    } else {
      onDutyDoctors.delete(doctorId);
      socket.leave("emergency_duty_pool");
      console.log("[MediLink Emergency] Dr. " + doctorName + " left Emergency Duty Pool (Total: " + onDutyDoctors.size + ")");
    }
    io.emit("emergency_pool_status", { availableDoctors: onDutyDoctors.size });
  });

  // 9. Query On-Duty Doctor Count
  socket.on("get_emergency_pool_status", (callback) => {
    if (typeof callback === "function") {
      callback({ availableDoctors: onDutyDoctors.size });
    }
  });

  // 10. Patient Dispatches Emergency SOS
  socket.on("trigger_emergency_sos", async (sosData, callback) => {
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
      } = sosData || {};

      const chatRoomId = "emergency-" + Date.now() + "-" + Math.floor(Math.random() * 1000);

      const emergencyAppt = new Appointment({
        patientId: patientId && mongoose.Types.ObjectId.isValid(patientId) ? patientId : null,
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
      console.log("[MediLink Emergency] 🚨 Emergency SOS Triggered: " + savedAppt.patientName + " (" + savedAppt.emergencyCategory + ") ID: " + savedAppt._id);

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
        dispatchedAt: new Date(),
        availableDoctors: onDutyDoctors.size
      };

      // Broadcast to on-duty room and to all connected doctor sockets
      io.to("emergency_duty_pool").emit("emergency_broadcast_alert", alertPayload);
      io.emit("emergency_incoming_global", alertPayload);

      if (typeof callback === "function") {
        callback({
          success: true,
          appointmentId: savedAppt._id,
          chatRoomId: savedAppt.chatRoomId,
          emergencyCase: alertPayload
        });
      }
    } catch (err) {
      console.error("[MediLink Emergency] Error saving/dispatching SOS:", err);
      if (typeof callback === "function") {
        callback({ success: false, message: "Emergency dispatch failed. Dial 108 or 112 immediately." });
      }
    }
  });

  // 11. Doctor Accepts Emergency Case
  socket.on("accept_emergency_case", async ({ appointmentId, doctorId, doctorName }, callback) => {
    try {
      if (!appointmentId || !mongoose.Types.ObjectId.isValid(appointmentId)) {
        if (typeof callback === "function") callback({ success: false, message: "Invalid emergency ID" });
        return;
      }

      const appt = await Appointment.findById(appointmentId);
      if (!appt) {
        if (typeof callback === "function") callback({ success: false, message: "Emergency case not found" });
        return;
      }

      if (appt.doctorId && String(appt.doctorId) !== String(doctorId) && appt.status === "IN_PROGRESS") {
        if (typeof callback === "function") {
          callback({
            success: false,
            alreadyClaimed: true,
            message: "Emergency case was already accepted by another physician."
          });
        }
        return;
      }

      appt.doctorId = doctorId;
      appt.status = "IN_PROGRESS";
      await appt.save();

      console.log("[MediLink Emergency] ⚡ Emergency Case " + appointmentId + " CLAIMED by Dr. " + doctorName);

      const claimData = {
        appointmentId: appt._id,
        chatRoomId: appt.chatRoomId,
        doctorId,
        doctorName,
        status: "IN_PROGRESS"
      };

      // Notify the emergency patient
      io.to(appt.chatRoomId).emit("emergency_case_claimed_by_doctor", claimData);
      io.emit("emergency_patient_connected", claimData);

      // Dismiss alert modal on other doctors screens
      io.emit("emergency_dismiss_modal", {
        appointmentId: appt._id,
        claimedByDoctor: doctorName
      });

      if (typeof callback === "function") {
        callback({
          success: true,
          appointment: appt,
          chatRoomId: appt.chatRoomId
        });
      }
    } catch (err) {
      console.error("[MediLink Emergency] Error claiming emergency:", err);
      if (typeof callback === "function") {
        callback({ success: false, message: "Server error claiming emergency." });
      }
    }
  });

  // 7. Handle Disconnect
  socket.on("disconnect", () => {
    console.log(`[MediLink Socket] Client disconnected: ${socket.id}`);
    const { chatRoomId, userRole } = socket.data || {};
    if (chatRoomId) {
      if (userRole === "DOCTOR") {
        const active = activeDoctorRooms.get(chatRoomId);
        if (active && active.socketId === socket.id) {
          activeDoctorRooms.delete(chatRoomId);
          io.to(chatRoomId).emit("doctor_presence", { online: false });
        }
      } else if (userRole === "PATIENT") {
        const active = activePatientRooms.get(chatRoomId);
        if (active && active.socketId === socket.id) {
          activePatientRooms.delete(chatRoomId);
          io.to(chatRoomId).emit("patient_presence", { online: false });
        }
      }
    }

    // Clean up Emergency Duty Pool if this socket was registered as on-duty doctor
    for (const [docId, val] of onDutyDoctors.entries()) {
      if (val.socketId === socket.id) {
        onDutyDoctors.delete(docId);
        console.log("[MediLink Emergency] Dr. " + val.doctorName + " disconnected from Emergency Duty Pool");
        io.emit("emergency_pool_status", { availableDoctors: onDutyDoctors.size });
      }
    }
  });
});

// Middleware
app.use(cors());
app.use(express.json());

// Serve static uploaded certificates
app.use("/uploads", express.static(pathPosix.join(__dirname, "../uploads")));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/doctor", doctorRoutes);
app.use("/api/patient", patientRoutes);
app.use("/api/chat", chatRoutes);

// Base health & status route
app.get("/api/health", (req, res) => {
  const isDbConnected = mongoose.connection.readyState === 1;
  res.status(200).json({
    status: "healthy",
    project: "MediLink Portal API",
    database: {
      connected: isDbConnected,
      status: isDbConnected ? "Connected to MongoDB" : "Disconnected",
      name: mongoose.connection.name || "medilink",
      host: mongoose.connection.host || "127.0.0.1"
    },
    sockets: {
      activeDoctorRooms: activeDoctorRooms.size,
      activePatientRooms: activePatientRooms.size,
      onDutyDoctors: onDutyDoctors.size
    },
    timestamp: new Date().toISOString()
  });
});

// Start DB and Server
const startServer = async () => {
  await connectDB();
  await seedAdmin();
  server.listen(PORT, () => {
    console.log(`MediLink Server with WebSockets running on http://localhost:${PORT}`);
    console.log(`Health endpoint: http://localhost:${PORT}/api/health`);
    console.log(`Doctor Clinical endpoints: http://localhost:${PORT}/api/doctor/:doctorId/appointments`);
    console.log(`Patient endpoints: http://localhost:${PORT}/api/patient/appointments`);
    console.log(`Chat endpoints: http://localhost:${PORT}/api/chat/:appointmentId/messages`);
  });
};

startServer();
