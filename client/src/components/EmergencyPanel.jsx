import React, { useState, useEffect, useRef } from "react";
import { 
  AlertTriangle, 
  PhoneCall, 
  X, 
  ShieldAlert, 
  HeartPulse, 
  MapPin, 
  Send, 
  CheckCircle, 
  Clock, 
  Flame, 
  User, 
  Phone, 
  Activity,
  ArrowLeft
} from "lucide-react";
import { socket, playNotificationChime } from "../socket";

export default function EmergencyPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [triageView, setTriageView] = useState("HOME"); // "HOME" | "FORM" | "WAITING" | "CONNECTED"
  
  // Intake Form State
  const [formData, setFormData] = useState({
    patientName: "",
    patientPhone: "",
    emergencyCategory: "🚨 Cardiac / Severe Chest Pain",
    emergencyLocation: "",
    symptoms: ""
  });

  // Emergency Case & Live Session State
  const [emergencyCase, setEmergencyCase] = useState(null);
  const emergencyCaseRef = useRef(null);
  const [assignedDoctor, setAssignedDoctor] = useState(null);
  const [availableDocsCount, setAvailableDocsCount] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [loadingDispatch, setLoadingDispatch] = useState(false);

  // Live Chat inside Emergency Panel
  const [chatMessages, setChatMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const chatScrollRef = useRef(null);

  // Auto-fill logged-in patient details if available
  useEffect(() => {
    try {
      const userStr = localStorage.getItem("user");
      if (userStr) {
        const u = JSON.parse(userStr);
        setFormData((prev) => ({
          ...prev,
          patientName: prev.patientName || u.name || "",
          patientPhone: prev.patientPhone || u.phone || "",
          emergencyLocation: prev.emergencyLocation || (u.patientProfile?.city ? (u.patientProfile.city + ", " + (u.patientProfile.state || "")) : "")
        }));
      }
    } catch (e) {
      // Ignore json parse error
    }
  }, [isOpen]);

  // Query on-duty doctors count when drawer is opened
  useEffect(() => {
    if (isOpen) {
      socket.emit("get_emergency_pool_status", (res) => {
        if (res && res.availableDoctors !== undefined) {
          setAvailableDocsCount(res.availableDoctors);
        }
      });
    }

    const handlePoolStatus = (data) => {
      if (data && data.availableDoctors !== undefined) {
        setAvailableDocsCount(data.availableDoctors);
      }
    };

    socket.on("emergency_pool_status", handlePoolStatus);
    return () => {
      socket.off("emergency_pool_status", handlePoolStatus);
    };
  }, [isOpen]);

  // Elapsed timer when waiting for doctor claim
  useEffect(() => {
    let interval = null;
    if (triageView === "WAITING") {
      setElapsedSeconds(0);
      interval = setInterval(() => {
        setElapsedSeconds((s) => s + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [triageView]);

    // Socket listener for doctor acceptance & live chat
  useEffect(() => {
    const handleCaseClaimed = (claimData) => {
      const activeCase = emergencyCaseRef.current;
      if (!activeCase) return;

      const matchAppt = String(claimData.appointmentId) === String(activeCase.appointmentId);
      const matchRoom = String(claimData.chatRoomId) === String(activeCase.chatRoomId);

      if (matchAppt || matchRoom) {
        playNotificationChime();
        setAssignedDoctor({
          doctorId: claimData.doctorId,
          doctorName: claimData.doctorName
        });
        setTriageView("CONNECTED");

        // Re-affirm join room as patient
        socket.emit("join_room", {
          chatRoomId: claimData.chatRoomId || activeCase.chatRoomId,
          appointmentId: claimData.appointmentId || activeCase.appointmentId,
          userRole: "PATIENT",
          userName: formData.patientName || "Emergency Patient",
          userId: "emergency-caller"
        });

        setChatMessages((prev) => [
          ...prev,
          {
            _id: "sys-" + Date.now(),
            senderRole: "SYSTEM",
            senderName: "MediLink Trauma Dispatch",
            text: "🚨 Dr. " + claimData.doctorName + " has entered this emergency priority channel. Live communication is active.",
            createdAt: new Date()
          }
        ]);
      }
    };

    const handleReceiveMsg = (msg) => {
      console.log("[EmergencyPanel] Message received:", msg);
      setChatMessages((prev) => [...prev, msg]);
      playNotificationChime();
    };

    socket.on("emergency_case_claimed_by_doctor", handleCaseClaimed);
    socket.on("emergency_patient_connected", handleCaseClaimed);
    socket.on("receive_message", handleReceiveMsg);

    return () => {
      socket.off("emergency_case_claimed_by_doctor", handleCaseClaimed);
      socket.off("emergency_patient_connected", handleCaseClaimed);
      socket.off("receive_message", handleReceiveMsg);
    };
  }, []);

  // Auto-scroll chat to latest
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages]);

  // Handle SOS Dispatch Submission
  const handleDispatchSOS = (e) => {
    e.preventDefault();
    if (!formData.patientName.trim()) {
      alert("Please provide the patient or caller name.");
      return;
    }
    if (!formData.patientPhone.trim()) {
      alert("Please provide a contact phone number for immediate callback.");
      return;
    }

    setLoadingDispatch(true);

    let loggedInUser = null;
    try {
      loggedInUser = JSON.parse(localStorage.getItem("user") || "null");
    } catch (_) {}

    const payload = {
      patientId: loggedInUser?._id || null,
      patientName: formData.patientName.trim(),
      patientPhone: formData.patientPhone.trim(),
      emergencyCategory: formData.emergencyCategory,
      emergencyLocation: formData.emergencyLocation.trim() || "Immediate trauma request via web",
      symptoms: formData.symptoms.trim() || (formData.emergencyCategory + ": Acute trauma / distress reported"),
      allergies: loggedInUser?.patientProfile?.allergies || [],
      chronicConditions: loggedInUser?.patientProfile?.chronicConditions || []
    };

        socket.emit("trigger_emergency_sos", payload, (response) => {
      setLoadingDispatch(false);
      if (response && response.success) {
        emergencyCaseRef.current = response;
        setEmergencyCase(response);
        setTriageView("WAITING");

        // IMMEDIATELY join room so socket presence and messages work flawlessly
        socket.emit("join_room", {
          chatRoomId: response.chatRoomId,
          appointmentId: response.appointmentId,
          userRole: "PATIENT",
          userName: payload.patientName || "Emergency Patient",
          userId: payload.patientId || "emergency-caller"
        });
      } else {
        alert(response?.message || "Failed to dispatch SOS. Dial 108 or 112 immediately.");
      }
    });
  };

    // Send message in Live Triage Chat
  const handleSendChat = (e) => {
    e.preventDefault();
    const activeCase = emergencyCaseRef.current || emergencyCase;
    if (!inputText.trim() || !activeCase) return;

    socket.emit("send_message", {
      chatRoomId: activeCase.chatRoomId,
      appointmentId: activeCase.appointmentId,
      senderRole: "PATIENT",
      senderName: formData.patientName || "Emergency Patient",
      text: inputText.trim()
    });

    setInputText("");
  };

  const handleReset = () => {
    setTriageView("HOME");
    setEmergencyCase(null);
    setAssignedDoctor(null);
    setChatMessages([]);
  };

  const formatTimer = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return (m < 10 ? "0" : "") + m + ":" + (s < 10 ? "0" : "") + s;
  };

  return (
    <>
      {/* Floating Emergency Button on the Right Edge of the Screen/Panel */}
      <button 
        type="button"
        className="emergency-fixed-trigger"
        onClick={() => setIsOpen(true)}
        aria-label="Open Emergency Contact Panel"
        title="Immediate Emergency Assistance"
      >
        <span className="emergency-beacon-ring" aria-hidden="true" />
        <span className="emergency-beacon-ring delay" aria-hidden="true" />
        <AlertTriangle size={18} className="emergency-trigger-icon" />
        <span>Emergency Contact</span>
      </button>

      {/* Emergency Slide-over Side Drawer Panel */}
      {isOpen && (
        <div className="emergency-drawer-overlay" onClick={() => setIsOpen(false)}>
          <div className="emergency-drawer" onClick={(e) => e.stopPropagation()}>
            {/* Drawer Header */}
            <div className="drawer-header">
              <div className="drawer-title-group">
                <div className="drawer-badge-icon" style={{ background: "#fee2e2", color: "#dc2626" }}>
                  <ShieldAlert size={22} />
                </div>
                <div>
                  <h3 style={{ fontSize: "1.15rem", fontWeight: 700, color: "#991b1b" }}>Emergency Trauma Desk</h3>
                  <p style={{ fontSize: "0.82rem", color: "#64748b" }}>
                    24/7 Rapid Medical Response | {availableDocsCount > 0 ? (
                      <span style={{ color: "#059669", fontWeight: 600 }}>🟢 {availableDocsCount} Doctor{availableDocsCount > 1 ? "s" : ""} on Duty</span>
                    ) : (
                      <span style={{ color: "#d97706", fontWeight: 600 }}>🟡 On-Call Dispatch Active</span>
                    )}
                  </p>
                </div>
              </div>
              <button 
                type="button" 
                className="drawer-close-btn"
                onClick={() => setIsOpen(false)}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            {/* Drawer Content */}
            <div className="drawer-body">
              {/* VIEW 1: HOME OVERVIEW */}
              {triageView === "HOME" && (
                <>
                  <div className="emergency-alert-card">
                    <strong>Critical Notice:</strong> For life-threatening emergencies, cardiac arrest, or severe trauma, immediately reach our direct trauma line or dial national emergency dispatch.
                  </div>

                  {/* 1-Click Triage Action Trigger */}
                  <button 
                    type="button" 
                    className="btn-emergency-action"
                    onClick={() => setTriageView("FORM")}
                    style={{ marginBottom: "20px" }}
                  >
                    <HeartPulse size={20} />
                    Instant 1-Click Triage SOS Session
                  </button>

                  {/* 1-Tap Emergency Hotline Numbers (India) */}
                  <div className="hotline-card">
                    <div>
                      <div style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: 600 }}>NATIONAL AMBULANCE DISPATCH</div>
                      <div className="hotline-number">108 / 112</div>
                    </div>
                    <a 
                      href="tel:108" 
                      style={{
                        background: "#fee2e2",
                        color: "#ef4444",
                        padding: "10px 14px",
                        borderRadius: "8px",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        fontWeight: 600,
                        fontSize: "0.88rem"
                      }}
                    >
                      <PhoneCall size={16} /> Call 108
                    </a>
                  </div>

                  <div className="hotline-card">
                    <div>
                      <div style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: 600 }}>HOSPITAL ER TOLL-FREE (INDIA)</div>
                      <div style={{ fontSize: "1.15rem", fontWeight: 800, color: "#0f172a" }}>1800-437-6334</div>
                    </div>
                    <a 
                      href="tel:18004376334" 
                      style={{
                        background: "#e0f2fe",
                        color: "#0284c7",
                        padding: "10px 14px",
                        borderRadius: "8px",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        fontWeight: 600,
                        fontSize: "0.88rem"
                      }}
                    >
                      <PhoneCall size={16} /> Call ER
                    </a>
                  </div>

                  {/* Physical Location */}
                  <div style={{ 
                    background: "#f8fafc", 
                    border: "1px solid #e2e8f0", 
                    borderRadius: "12px", 
                    padding: "16px",
                    display: "flex",
                    gap: "12px",
                    alignItems: "flex-start",
                    marginTop: "8px"
                  }}>
                    <MapPin size={20} color="#0284c7" style={{ marginTop: "2px", flexShrink: 0 }} />
                    <div style={{ fontSize: "0.88rem", color: "#475569" }}>
                      <strong style={{ color: "#0f172a", display: "block", marginBottom: "2px" }}>MediLink Central Emergency Pavilion</strong>
                      Gate No. 2, Trauma Center Block, Ansari Nagar / Central Medical Hub
                    </div>
                  </div>
                </>
              )}

              {/* VIEW 2: RAPID SOS INTAKE FORM */}
              {triageView === "FORM" && (
                <form onSubmit={handleDispatchSOS} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <button 
                      type="button" 
                      onClick={() => setTriageView("HOME")}
                      style={{ background: "none", border: "none", color: "#64748b", display: "flex", alignItems: "center", gap: "4px", fontSize: "0.85rem", cursor: "pointer", fontWeight: 600 }}
                    >
                      <ArrowLeft size={16} /> Back
                    </button>
                    <span style={{ fontSize: "0.8rem", color: "#dc2626", fontWeight: 700, background: "#fee2e2", padding: "4px 8px", borderRadius: "6px" }}>
                      ⚡ Priority Intake (15 Sec)
                    </span>
                  </div>

                  <div style={{ background: "#fef2f2", border: "1px solid #fecaca", padding: "12px", borderRadius: "8px", fontSize: "0.85rem", color: "#991b1b" }}>
                    <strong>Immediate Dispatch:</strong> Your request will instantly sound a priority alarm for all on-duty hospital physicians.
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, color: "#1e293b", marginBottom: "6px" }}>
                      Patient / Caller Full Name *
                    </label>
                    <input 
                      type="text" 
                      className="form-input"
                      placeholder="e.g., Rajesh Kumar" 
                      value={formData.patientName}
                      onChange={(e) => setFormData({ ...formData, patientName: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, color: "#1e293b", marginBottom: "6px" }}>
                      Contact Mobile Number *
                    </label>
                    <input 
                      type="tel" 
                      className="form-input"
                      placeholder="e.g., +91 98765 43210" 
                      value={formData.patientPhone}
                      onChange={(e) => setFormData({ ...formData, patientPhone: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, color: "#1e293b", marginBottom: "6px" }}>
                      Emergency Category *
                    </label>
                    <select 
                      className="form-input form-select"
                      value={formData.emergencyCategory}
                      onChange={(e) => setFormData({ ...formData, emergencyCategory: e.target.value })}
                    >
                      <option value="🚨 Cardiac / Severe Chest Pain">🚨 Cardiac / Severe Chest Pain</option>
                      <option value="🫁 Breathing Distress / Suffocation">🫁 Breathing Distress / Suffocation</option>
                      <option value="🩸 Severe Bleeding / Road Trauma">🩸 Severe Bleeding / Road Trauma</option>
                      <option value="🧠 Stroke / Loss of Consciousness">🧠 Stroke / Loss of Consciousness</option>
                      <option value="👶 Pediatric Emergency / Child Trauma">👶 Pediatric Emergency / Child Trauma</option>
                      <option value="⚠️ Acute Poisoning / Severe Allergic Shock">⚠️ Acute Poisoning / Severe Allergic Shock</option>
                      <option value="High Trauma / Other Urgent Emergency">High Trauma / Other Urgent Emergency</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, color: "#1e293b", marginBottom: "6px" }}>
                      Current Location / City / Landmark
                    </label>
                    <input 
                      type="text" 
                      className="form-input"
                      placeholder="e.g., Green Park Extension, New Delhi" 
                      value={formData.emergencyLocation}
                      onChange={(e) => setFormData({ ...formData, emergencyLocation: e.target.value })}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, color: "#1e293b", marginBottom: "6px" }}>
                      Symptoms / Critical Notes
                    </label>
                    <textarea 
                      className="form-input"
                      rows={2}
                      placeholder="Describe symptoms, patient responsiveness, or injuries..."
                      value={formData.symptoms}
                      onChange={(e) => setFormData({ ...formData, symptoms: e.target.value })}
                    />
                  </div>

                  <button 
                    type="submit" 
                    className="btn-emergency-action"
                    disabled={loadingDispatch}
                    style={{ marginTop: "8px" }}
                  >
                    <ShieldAlert size={20} />
                    {loadingDispatch ? "Dispatching Alarm..." : "🚨 SOUND EMERGENCY ALARM (SOS)"}
                  </button>
                </form>
              )}

              {/* VIEW 3: WAITING FOR DOCTOR CLAIM (RADAR PULSE) */}
              {triageView === "WAITING" && (
                <div style={{ textAlign: "center", padding: "24px 10px" }}>
                  <div style={{
                    width: "80px",
                    height: "80px",
                    background: "#fee2e2",
                    borderRadius: "50%",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: "16px",
                    boxShadow: "0 0 0 12px rgba(239, 68, 68, 0.15)",
                    animation: "pulseSubtle 1.8s infinite"
                  }}>
                    <HeartPulse size={40} color="#dc2626" />
                  </div>

                  <h3 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#991b1b", marginBottom: "6px" }}>
                    Broadcasting Emergency SOS
                  </h3>
                  <p style={{ fontSize: "0.88rem", color: "#64748b", marginBottom: "16px" }}>
                    Paging on-duty ER physicians... siren is ringing across available terminals.
                  </p>

                  <div style={{
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    borderRadius: "10px",
                    padding: "16px",
                    marginBottom: "20px",
                    textAlign: "left",
                    fontSize: "0.85rem",
                    display: "flex",
                    flexDirection: "column",
                    gap: "6px"
                  }}>
                    <div><strong>Patient:</strong> {formData.patientName} ({formData.patientPhone})</div>
                    <div><strong>Condition:</strong> <span style={{ color: "#dc2626", fontWeight: 700 }}>{formData.emergencyCategory}</span></div>
                    <div><strong>Location:</strong> {formData.emergencyLocation || "Provided via SOS"}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "8px", color: "#0284c7", fontWeight: 700 }}>
                      <Clock size={16} /> Elapsed Response Time: {formatTimer(elapsedSeconds)}
                    </div>
                  </div>

                  <div style={{ background: "#fef2f2", border: "1px solid #fecaca", padding: "12px", borderRadius: "8px", fontSize: "0.85rem", color: "#991b1b", marginBottom: "20px" }}>
                    🚨 <strong>Patient not breathing or critical?</strong> Immediately dial <strong>108</strong> without waiting.
                  </div>

                  <div style={{ display: "flex", gap: "10px" }}>
                    <a 
                      href="tel:108"
                      style={{
                        flex: 1,
                        background: "#dc2626",
                        color: "#fff",
                        padding: "12px",
                        borderRadius: "8px",
                        fontWeight: 700,
                        fontSize: "0.9rem",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "6px"
                      }}
                    >
                      <PhoneCall size={16} /> Call 108
                    </a>
                    <button 
                      type="button"
                      onClick={handleReset}
                      style={{
                        padding: "12px 18px",
                        background: "#f1f5f9",
                        border: "1px solid #cbd5e1",
                        borderRadius: "8px",
                        color: "#475569",
                        fontWeight: 600,
                        fontSize: "0.85rem"
                      }}
                    >
                      Cancel SOS
                    </button>
                  </div>
                </div>
              )}

              {/* VIEW 4: DOCTOR CONNECTED - LIVE TRIAGE ROOM */}
              {triageView === "CONNECTED" && assignedDoctor && (
                <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
                  {/* Doctor Banner */}
                  <div style={{
                    background: "linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)",
                    border: "1px solid #a7f3d0",
                    borderRadius: "10px",
                    padding: "12px 16px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: "12px"
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <div style={{ width: "36px", height: "36px", background: "#059669", color: "#fff", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800 }}>
                        Dr
                      </div>
                      <div>
                        <div style={{ fontWeight: 800, color: "#065f46", fontSize: "0.95rem" }}>
                          Dr. {assignedDoctor.doctorName}
                        </div>
                        <div style={{ fontSize: "0.78rem", color: "#047857", fontWeight: 600 }}>
                          🟢 Live Priority Emergency Channel
                        </div>
                      </div>
                    </div>
                    <a 
                      href="tel:18004376334" 
                      style={{ background: "#059669", color: "#fff", padding: "6px 10px", borderRadius: "6px", fontSize: "0.78rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "4px" }}
                    >
                      <PhoneCall size={12} /> Call ER
                    </a>
                  </div>

                  {/* Chat Messages */}
                  <div 
                    ref={chatScrollRef}
                    style={{
                      flex: 1,
                      minHeight: "260px",
                      maxHeight: "340px",
                      overflowY: "auto",
                      background: "#f8fafc",
                      border: "1px solid #e2e8f0",
                      borderRadius: "10px",
                      padding: "12px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "10px",
                      marginBottom: "12px"
                    }}
                  >
                    {chatMessages.map((m, idx) => {
                      if (m.senderRole === "SYSTEM") {
                        return (
                          <div key={m._id || idx} style={{ textAlign: "center", fontSize: "0.78rem", color: "#b91c1c", background: "#fef2f2", padding: "6px 10px", borderRadius: "6px", border: "1px solid #fecaca" }}>
                            {m.text}
                          </div>
                        );
                      }
                      const isMe = m.senderRole === "PATIENT";
                      return (
                        <div 
                          key={m._id || idx}
                          style={{
                            alignSelf: isMe ? "flex-end" : "flex-start",
                            maxWidth: "85%",
                            background: isMe ? "#dc2626" : "#ffffff",
                            color: isMe ? "#ffffff" : "#0f172a",
                            padding: "8px 12px",
                            borderRadius: "10px",
                            boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                            border: isMe ? "none" : "1px solid #e2e8f0"
                          }}
                        >
                          <div style={{ fontSize: "0.72rem", opacity: 0.8, marginBottom: "2px", fontWeight: 600 }}>
                            {m.senderName}
                          </div>
                          <div style={{ fontSize: "0.85rem", lineHeight: 1.4 }}>
                            {m.text}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Chat Input */}
                  <form onSubmit={handleSendChat} style={{ display: "flex", gap: "8px" }}>
                    <input 
                      type="text" 
                      className="form-input"
                      placeholder="Type urgent reply or questions..."
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      style={{ flex: 1, padding: "10px 14px", fontSize: "0.85rem" }}
                    />
                    <button 
                      type="submit" 
                      style={{
                        background: "#dc2626",
                        color: "#fff",
                        border: "none",
                        borderRadius: "8px",
                        padding: "0 16px",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                      }}
                    >
                      <Send size={16} />
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
