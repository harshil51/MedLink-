import React, { useState, useEffect, useRef } from 'react';
import { socket, playNotificationChime, playEmergencySirenAlert, showDesktopNotification } from '../socket';
import { 
  Stethoscope, 
  User, 
  LogOut, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  FileText, 
  Send, 
  Plus, 
  Trash2, 
  HeartPulse, 
  Calendar, 
  Phone, 
  Activity, 
  X, 
  Printer, 
  Lock, 
  Flame,
  AlertTriangle,
  ShieldAlert
} from 'lucide-react';

export default function DoctorDashboard({ doctor, onLogout }) {
  const doctorId = doctor?.id || doctor?._id;

  // Active Tab: 'appointments' | 'prescriptions'
  const [activeTab, setActiveTab] = useState('appointments');

  // Emergency Duty Toggle State
  const [isEmergencyDuty, setIsEmergencyDuty] = useState(Boolean(doctor?.doctorProfile?.isOnline));
  const [incomingEmergency, setIncomingEmergency] = useState(null);
  const [emergencyCountdown, setEmergencyCountdown] = useState(180);

  // Data States
  const [appointments, setAppointments] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Active Modals
  const [activeHistoryPatient, setActiveHistoryPatient] = useState(null); // Medical History Modal
  const [activeConsultation, setActiveConsultation] = useState(null); // Live Consultation Chat Modal
  const [activePrescriptionAppt, setActivePrescriptionAppt] = useState(null); // Prescription Builder Modal
  const [viewingPrescription, setViewingPrescription] = useState(null); // Prescription Slip Preview Modal

  // Live Chat State
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [sessionTimer, setSessionTimer] = useState(86400); // 24 hours in seconds (Testing mode)
  const [patientOnline, setPatientOnline] = useState(false);
  const [patientTyping, setPatientTyping] = useState(false);
  const chatBottomRef = useRef(null);

  // Automatic scroll down to latest chat
  useEffect(() => {
    if (activeConsultation) {
      chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages, activeConsultation, patientTyping]);

  // Prescription Form State (Clean empty fields for real clinical entry)
  const [rxDiagnosis, setRxDiagnosis] = useState('');
  const [rxAdvice, setRxAdvice] = useState('');
  const [rxFollowUp, setRxFollowUp] = useState('After 7 Days');
  const [rxMedications, setRxMedications] = useState([
    { name: '', dosage: '', frequency: '1-0-1 (After Food)', duration: '5 Days' }
  ]);
  const [rxSubmitting, setRxSubmitting] = useState(false);

  // Clock
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date().toLocaleTimeString()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Countdown timer for active consultation
  useEffect(() => {
    if (!activeConsultation) return;
    const interval = setInterval(() => {
      setSessionTimer((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [activeConsultation]);

  // Real-Time Room Sync for Doctor: Join room, load history, listen for messages & patient presence
  useEffect(() => {
    if (!activeConsultation) return;

    const roomId = activeConsultation.chatRoomId;
    const apptId = activeConsultation._id;

    // 1. Join room as DOCTOR (broadcasts presence to patient)
    socket.emit("join_room", {
      chatRoomId: roomId,
      appointmentId: apptId,
      userRole: "DOCTOR",
      userName: doctor?.name || "Doctor",
      userId: doctorId
    });

    // 2. Fetch persistent message history from MongoDB
    fetch(`http://localhost:5001/api/chat/${apptId}/messages`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.messages && data.messages.length > 0) {
          const mapped = data.messages.map((m) => ({
            id: m._id,
            sender: m.senderRole === "DOCTOR" ? "doctor" : m.senderRole === "PATIENT" ? "patient" : "system",
            text: m.text,
            time: new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          }));
          setChatMessages(mapped);
        }
      })
      .catch((err) => console.error("Error loading chat history:", err));

    // 3. Query initial patient status
    socket.emit("check_patient_status", { chatRoomId: roomId });

    const handlePatientPresence = (data) => {
      console.log("[DoctorDashboard] Received patient_presence:", data);
      setPatientOnline(Boolean(data.online));
      if (data.online) {
        playNotificationChime();
      }
    };

    const handleReceiveMessage = (msg) => {
      console.log("[DoctorDashboard] Received message:", msg);
      const mappedMsg = {
        id: msg._id || Date.now(),
        sender: msg.senderRole === "DOCTOR" ? "doctor" : msg.senderRole === "PATIENT" ? "patient" : "system",
        text: msg.text,
        time: new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      };
      setChatMessages((prev) => [...prev, mappedMsg]);
      if (msg.senderRole === "PATIENT") {
        playNotificationChime();
      }
    };

    const handleUserTyping = (data) => {
      if (data.senderRole === "PATIENT") {
        setPatientTyping(Boolean(data.isTyping));
      }
    };

    socket.on("patient_presence", handlePatientPresence);
    socket.on("receive_message", handleReceiveMessage);
    socket.on("user_typing", handleUserTyping);

    return () => {
      socket.emit("leave_room", { chatRoomId: roomId, userRole: "DOCTOR" });
      socket.off("patient_presence", handlePatientPresence);
      socket.off("receive_message", handleReceiveMessage);
      socket.off("user_typing", handleUserTyping);
    };
  }, [activeConsultation, doctorId, doctor]);

  // Load real appointments and prescriptions from MongoDB
  const loadDoctorData = async () => {
    if (!doctorId) return;
    setLoading(true);
    try {
      const [apptsRes, rxRes] = await Promise.all([
        fetch(`http://localhost:5001/api/doctor/${doctorId}/appointments`),
        fetch(`http://localhost:5001/api/doctor/${doctorId}/prescriptions`)
      ]);
      const apptsData = await apptsRes.json();
      const rxData = await rxRes.json();

      if (apptsData.success) setAppointments(apptsData.appointments || []);
      if (rxData.success) setPrescriptions(rxData.prescriptions || []);
    } catch (err) {
      console.error('Error fetching doctor data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDoctorData();
  }, [doctorId]);


  // Register doctor on emergency duty in Socket.io pool
  useEffect(() => {
    if (!doctorId) return;

    socket.emit("register_doctor_duty", {
      doctorId,
      doctorName: doctor?.name || "Dr. Medical Officer",
      isDuty: isEmergencyDuty
    });

    const handleEmergencyAlert = (alertData) => {
      if (!isEmergencyDuty) return;
      playEmergencySirenAlert();
      showDesktopNotification("🚨 CRITICAL EMERGENCY SOS", (alertData.patientName || "Caller") + " - " + (alertData.emergencyCategory || "Trauma"));
      setIncomingEmergency(alertData);
    };

    const handleEmergencyDismiss = ({ appointmentId }) => {
      setIncomingEmergency((curr) => (curr && curr.appointmentId === appointmentId ? null : curr));
    };

    socket.on("emergency_broadcast_alert", handleEmergencyAlert);
    socket.on("emergency_incoming_global", handleEmergencyAlert);
    socket.on("emergency_dismiss_modal", handleEmergencyDismiss);

    return () => {
      socket.off("emergency_broadcast_alert", handleEmergencyAlert);
      socket.off("emergency_incoming_global", handleEmergencyAlert);
      socket.off("emergency_dismiss_modal", handleEmergencyDismiss);
    };
  }, [doctorId, doctor?.name, isEmergencyDuty]);


  // 3-Minute (180s) Response Window Timer & Periodic Alert for Incoming Emergency
  useEffect(() => {
    let timer = null;
    if (incomingEmergency) {
      setEmergencyCountdown(180);
      timer = setInterval(() => {
        setEmergencyCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            setIncomingEmergency(null);
            return 0;
          }
          // Periodic audible alert every 20 seconds while modal is unattended
          if (prev % 20 === 0) {
            playEmergencySirenAlert();
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [incomingEmergency]);

  // Accept emergency case handler
  const handleAcceptEmergency = (emergencyCase) => {
    socket.emit("accept_emergency_case", {
      appointmentId: emergencyCase.appointmentId,
      doctorId,
      doctorName: doctor?.name || "Dr. Medical Officer"
    }, (res) => {
      if (res && res.success) {
        setIncomingEmergency(null);
        loadDoctorData();
        const newConsultationAppt = {
          _id: res.appointment._id,
          doctorId,
          patientName: emergencyCase.patientName,
          patientPhone: emergencyCase.patientPhone,
          patientAge: emergencyCase.patientAge || null,
          patientGender: emergencyCase.patientGender || "",
          patientBloodGroup: emergencyCase.patientBloodGroup || "",
          allergies: emergencyCase.allergies || [],
          chronicConditions: emergencyCase.chronicConditions || [],
          emergencyContact: null,
          symptoms: emergencyCase.symptoms,
          chatRoomId: res.appointment.chatRoomId,
          isEmergency: true,
          emergencyCategory: emergencyCase.emergencyCategory,
          emergencyLocation: emergencyCase.emergencyLocation,
          status: "IN_PROGRESS"
        };
        handleEnterConsultation(newConsultationAppt);
      } else if (res && res.alreadyClaimed) {
        alert("Notice: This emergency case was already claimed by another on-duty physician.");
        setIncomingEmergency(null);
      }
    });
  };



  // Toggle Emergency Duty
  const handleToggleEmergencyDuty = async () => {
    const newStatus = !isEmergencyDuty;
    setIsEmergencyDuty(newStatus);
    socket.emit("register_doctor_duty", {
      doctorId,
      doctorName: doctor?.name || "Dr. Medical Officer",
      isDuty: newStatus
    });
    try {
      await fetch(`http://localhost:5001/api/doctor/${doctorId}/duty`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isOnline: newStatus })
      });
    } catch (err) {
      console.error('Failed to update duty status', err);
    }
  };

  // Helper: Check if slot is within pre-consultation window (Testing mode: whole 24 hours timeline)
  const isPreReviewAccessible = (appt) => {
    // Unlocked across the entire 24-hour timeline for testing
    return true;
  };

  // Helpers to clean medical history data
  const getCleanAllergies = (allergiesList) => {
    if (!allergiesList || !Array.isArray(allergiesList)) return [];
    return allergiesList.filter(
      (a) => a && a.trim() !== '' && a.toLowerCase() !== 'none' && a.toLowerCase() !== 'none reported'
    );
  };

  const getCleanConditions = (conditionsList) => {
    if (!conditionsList || !Array.isArray(conditionsList)) return [];
    return conditionsList.filter(
      (c) => c && c.trim() !== '' && c.toLowerCase() !== 'none' && c.toLowerCase() !== 'none reported'
    );
  };

  // Start Live Consultation
  const handleEnterConsultation = (appt) => {
    setActiveConsultation(appt);
    setSessionTimer(86400); // 24 hours timeline for testing
    setChatMessages([]);
    setPatientOnline(false);
  };

  // Send message in consultation chat via WebSocket
  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!chatInput.trim() || !activeConsultation) return;

    socket.emit("send_message", {
      chatRoomId: activeConsultation.chatRoomId,
      appointmentId: activeConsultation._id,
      senderRole: "DOCTOR",
      senderName: doctor?.name ? (doctor.name.startsWith("Dr") ? doctor.name : "Dr. " + doctor.name) : "Dr. Medical Officer",
      text: chatInput.trim()
    });

    socket.emit("typing", {
      chatRoomId: activeConsultation.chatRoomId,
      senderName: doctor?.name ? (doctor.name.startsWith("Dr") ? doctor.name : "Dr. " + doctor.name) : "Dr. Medical Officer",
      senderRole: "DOCTOR",
      isTyping: false
    });

    setChatInput("");
  };

  const handleChatInputChange = (e) => {
    const val = e.target.value;
    setChatInput(val);
    if (activeConsultation) {
      socket.emit("typing", {
        chatRoomId: activeConsultation.chatRoomId,
        senderName: doctor?.name ? (doctor.name.startsWith("Dr") ? doctor.name : "Dr. " + doctor.name) : "Dr. Medical Officer",
        senderRole: "DOCTOR",
        isTyping: val.trim().length > 0
      });
    }
  };

  // End consultation and open prescription builder
  const handleEndConsultationToRx = () => {
    const appt = activeConsultation;
    setActiveConsultation(null);
    setActivePrescriptionAppt(appt);
    setRxDiagnosis('');
    setRxMedications([{ name: '', dosage: '', frequency: '1-0-1 (After Food)', duration: '5 Days' }]);
  };

  // Add medication row
  const handleAddMedication = () => {
    setRxMedications((prev) => [
      ...prev,
      { name: '', dosage: '', frequency: '1-0-1 (After Food)', duration: '5 Days' }
    ]);
  };

  // Remove medication row
  const handleRemoveMedication = (index) => {
    setRxMedications((prev) => prev.filter((_, i) => i !== index));
  };

  // Update medication row field
  const handleUpdateMedication = (index, field, value) => {
    setRxMedications((prev) => {
      const updated = [...prev];
      updated[index][field] = value;
      return updated;
    });
  };

  // Submit Prescription to Backend
  const handleSavePrescription = async (e) => {
    e.preventDefault();
    setRxSubmitting(true);

    try {
      const validMeds = rxMedications.filter((m) => m.name.trim() !== '');
      if (validMeds.length === 0) {
        alert('Please enter at least one medication name.');
        setRxSubmitting(false);
        return;
      }

      const res = await fetch('http://localhost:5001/api/doctor/prescriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appointmentId: activePrescriptionAppt._id,
          doctorId,
          doctorName: doctor?.name || 'Dr. Medical Officer',
          patientName: activePrescriptionAppt.patientName,
          diagnosis: rxDiagnosis.trim(),
          medications: validMeds,
          doctorAdvice: rxAdvice,
          nextFollowUpDate: rxFollowUp
        })
      });

      const data = await res.json();
      if (res.ok) {
        setActivePrescriptionAppt(null);
        await loadDoctorData();
        setViewingPrescription(data.prescription);
      } else {
        alert(data.message || 'Error creating prescription');
      }
    } catch (err) {
      alert('Failed to connect to prescription server.');
    } finally {
      setRxSubmitting(false);
    }
  };

  // Format Timer hh:mm:ss for 24-hour timeline
  const formatTimer = (secs) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) {
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const inProgressCount = appointments.filter((a) => a.status === 'IN_PROGRESS').length;

  return (
    <div className="doc-portal-root">
      <div className="container" style={{ maxWidth: '1240px', padding: '36px 20px 80px' }}>
        
        {/* ================= 1. DOCTOR TOP IDENTITY & ON-CALL BAR ================= */}
        <div className="doc-header-strip">
          <div className="doc-profile-left">
            <div className="doc-badge-avatar">
              <Stethoscope size={30} color="#0284c7" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <h1 className="doc-portal-name">Dr. {doctor?.name?.replace(/^Dr\.?\s*/i, '')}</h1>
                <span className="badge-active-status">
                  <CheckCircle2 size={13} /> NMC Verified & Active
                </span>
              </div>
              <p className="doc-portal-credentials">
                <span>{doctor?.doctorProfile?.qualification || 'MBBS, MD'}</span> •{' '}
                <strong style={{ color: '#0284c7' }}>{doctor?.doctorProfile?.specialization || 'Medical Specialist'}</strong> •{' '}
                <span>Reg: {doctor?.doctorProfile?.licenseNumber || 'NMC-IND-REG'}</span>
              </p>
            </div>
          </div>

          <div className="doc-header-actions">
            {/* Live Clock */}
            <div className="hospital-clock-pill">
              <Clock size={15} color="#0284c7" />
              <span>{currentTime}</span>
            </div>

            {/* ER On-Call Shift Toggle Switch */}
            <div 
              className={`duty-toggle-box ${isEmergencyDuty ? 'duty-on' : 'duty-off'}`}
              onClick={handleToggleEmergencyDuty}
              title="Toggle hospital ER on-call triage availability"
            >
              <Flame size={16} />
              <div className="duty-text-col">
                <span className="duty-title">ER On-Call Shift</span>
                <span className="duty-status-txt">{isEmergencyDuty ? 'ON (Available)' : 'OFF (Standby)'}</span>
              </div>
              <div className="duty-switch-dot"></div>
            </div>

            {/* Logout */}
            <button 
              type="button" 
              className="btn-admin-logout"
              onClick={onLogout}
            >
              <LogOut size={16} />
              Logout
            </button>
          </div>
        </div>

        {/* ================= 2. QUICK METRIC STATS STRIP ================= */}
        <div className="doc-metrics-strip">
          <div className="doc-metric-card">
            <div className="metric-icon-circle blue">
              <Calendar size={22} />
            </div>
            <div>
              <div className="metric-number">{appointments.length}</div>
              <div className="metric-label">Booked Appointments (Real DB)</div>
            </div>
          </div>

          <div className="doc-metric-card">
            <div className="metric-icon-circle emerald">
              <Activity size={22} />
            </div>
            <div>
              <div className="metric-number">{inProgressCount}</div>
              <div className="metric-label">In-Consultation Sessions</div>
            </div>
          </div>

          <div className="doc-metric-card">
            <div className="metric-icon-circle amber">
              <Flame size={22} />
            </div>
            <div>
              <div className="metric-number">{isEmergencyDuty ? 'On-Call' : 'Standby'}</div>
              <div className="metric-label">Hospital ER Status</div>
            </div>
          </div>

          <div className="doc-metric-card">
            <div className="metric-icon-circle purple">
              <FileText size={22} />
            </div>
            <div>
              <div className="metric-number">{prescriptions.length}</div>
              <div className="metric-label">Prescriptions Issued</div>
            </div>
          </div>
        </div>

        

        {/* ================= 3. TABS NAVIGATION ================= */}
        <div className="doc-tabs-nav">
          <button 
            type="button" 
            className={`doc-tab-btn ${activeTab === 'appointments' ? 'active' : ''}`}
            onClick={() => setActiveTab('appointments')}
          >
            <Calendar size={18} />
            Booked Consultations ({appointments.length})
          </button>
          <button 
            type="button" 
            className={`doc-tab-btn ${activeTab === 'prescriptions' ? 'active' : ''}`}
            onClick={() => setActiveTab('prescriptions')}
          >
            <FileText size={18} />
            Issued Prescriptions Archive ({prescriptions.length})
          </button>
        </div>

        {/* ================= 4. TAB 1: BOOKED 1-HOUR SLOTS FROM DATABASE ================= */}
        {activeTab === 'appointments' && (
          <div className="doc-slots-container">
            <div className="section-title-strip" style={{ marginBottom: '18px' }}>
              <Clock size={20} color="#0284c7" />
              <h2 className="admin-subheading">
                Scheduled Consultations (Live Patient Data)
              </h2>
            </div>

            {loading ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                Loading appointments from hospital database...
              </div>
            ) : appointments.length === 0 ? (
              <div className="admin-empty-state" style={{ padding: '50px 20px' }}>
                <CheckCircle2 size={40} color="#10b981" />
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0f172a', margin: '10px 0 4px' }}>
                  No Appointments Booked Yet
                </h3>
                <p style={{ color: '#64748b', maxWidth: '460px' }}>
                  When registered patients book a 1-hour consultation with you, their actual profile, complaints, 
                  and medical baseline will appear here automatically.
                </p>
              </div>
            ) : (
              <div className="slots-grid">
                {appointments.map((appt) => {
                  const preReviewOpen = isPreReviewAccessible(appt);
                  const isNowActive = appt.status === 'IN_PROGRESS';
                  const isDone = appt.status === 'COMPLETED';

                  const start = new Date(appt.scheduledStartTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                  const end = new Date(appt.scheduledEndTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                  const dateStr = new Date(appt.scheduledStartTime).toLocaleDateString();

                  return (
                    <div 
                      key={appt._id} 
                      className={`slot-card ${isNowActive ? 'slot-card-active' : ''} ${isDone ? 'slot-card-done' : ''}`}
                    >
                      {/* Card Header: Slot Time & Status */}
                      <div className="slot-card-header">
                        <div className="slot-time-badge">
                          <Clock size={14} />
                          <span>{dateStr} • {start} – {end}</span>
                        </div>
                        {appt.isEmergency && (
                          <span style={{ background: "#fee2e2", color: "#dc2626", border: "1px solid #fecaca", padding: "4px 8px", borderRadius: "6px", fontWeight: 800, fontSize: "0.75rem", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                            <Flame size={12} /> CRITICAL SOS
                          </span>
                        )}
                        {isNowActive && <span className="status-badge-live">● LIVE NOW</span>}
                        {isDone && <span className="status-badge-completed">✓ COMPLETED</span>}
                        {!isNowActive && !isDone && !appt.isEmergency && <span className="status-badge-booked">SCHEDULED</span>}
                      </div>

                      {/* Patient Profile Details */}
                      <div className="slot-patient-info">
                        <div className="patient-avatar-letter">
                          {appt.patientName ? appt.patientName.charAt(0).toUpperCase() : 'P'}
                        </div>
                        <div className="patient-meta">
                          <div className="patient-name">{appt.patientName}</div>
                          <div className="patient-stats">
                            {appt.patientAge ? `${appt.patientAge} Yrs` : "Age not recorded"} • {appt.patientGender || "Gender not specified"} • Blood: <strong style={{ color: appt.patientBloodGroup ? "#dc2626" : "#64748b" }}>{appt.patientBloodGroup || "Not recorded"}</strong>
                          </div>
                          <div className="patient-phone">
                            <Phone size={12} /> {appt.patientPhone || "No contact phone"}
                          </div>
                        </div>
                      </div>

                      {/* Reported Chief Complaints */}
                      <div className="slot-symptoms-box">
                        <span className="symptom-tag">Chief Complaint:</span>
                        <p className="symptom-text">{appt.symptoms || 'No complaint details provided by patient.'}</p>
                      </div>

                      {/* Actions */}
                      <div className="slot-action-footer">
                        {/* 10-Minute Pre-Consultation Trigger */}
                        {preReviewOpen ? (
                          <button
                            type="button"
                            className="btn-pre-review active"
                            onClick={() => setActiveHistoryPatient(appt)}
                            title="Inspect live patient medical baseline"
                          >
                            <FileText size={15} />
                            <span>📋 Review Patient History (24h Window)</span>
                          </button>
                        ) : (
                          <div className="btn-pre-review locked" title="Unlocks exactly 10 minutes prior to slot start time">
                            <Lock size={14} />
                            <span>History unlocks 10m before</span>
                          </div>
                        )}

                        {/* Consultation Chat Entry */}
                        {isDone ? (
                          <button
                            type="button"
                            className="btn-view-rx"
                            onClick={() => {
                              const found = prescriptions.find((p) => p.appointmentId === appt._id);
                              if (found) setViewingPrescription(found);
                              else alert('Prescription record already issued for this appointment.');
                            }}
                          >
                            <FileText size={15} /> View Prescription Slip
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="btn-enter-consult"
                            onClick={() => handleEnterConsultation(appt)}
                          >
                            <HeartPulse size={16} /> Enter Chat Room
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ================= 5. TAB 2: ISSUED PRESCRIPTIONS ARCHIVE ================= */}
        {activeTab === 'prescriptions' && (
          <div className="admin-section-box">
            <div className="section-title-strip">
              <FileText size={20} color="#0284c7" />
              <h2 className="admin-subheading">
                Issued Prescriptions Archive ({prescriptions.length})
              </h2>
            </div>

            {prescriptions.length === 0 ? (
              <div className="admin-empty-state">
                <FileText size={38} color="#94a3b8" />
                <p>No prescriptions issued yet. Complete consultations to issue official medical reports.</p>
              </div>
            ) : (
              <div className="doctors-table-wrapper">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Patient Name</th>
                      <th>Clinical Diagnosis</th>
                      <th>Medications Prescribed</th>
                      <th>Follow-Up Date</th>
                      <th>Issued Timestamp</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {prescriptions.map((rx) => (
                      <tr key={rx._id}>
                        <td>
                          <strong>{rx.patientName}</strong>
                        </td>
                        <td>
                          <span className="spec-badge">{rx.diagnosis}</span>
                        </td>
                        <td>
                          <div style={{ fontSize: '0.86rem', color: '#0f172a' }}>
                            {rx.medications?.map((m) => m.name).join(', ')}
                          </div>
                          <span className="table-sub-detail">{rx.medications?.length} medicine(s)</span>
                        </td>
                        <td>{rx.nextFollowUpDate}</td>
                        <td style={{ fontSize: '0.84rem', color: '#64748b' }}>
                          {new Date(rx.issuedAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                        </td>
                        <td>
                          <button
                            type="button"
                            className="btn-preview-slip"
                            onClick={() => setViewingPrescription(rx)}
                          >
                            <FileText size={14} /> View Rx Slip
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        
        {/* ================= INCOMING CRITICAL EMERGENCY ALERT MODAL (3-MINUTE WINDOW) ================= */}
        {incomingEmergency && (
          <div className="emergency-alert-overlay">
            <div className="emergency-alert-modal">
              <div className="emerg-alert-icon">
                <ShieldAlert size={40} color="#dc2626" />
              </div>

              <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "#fee2e2", color: "#b91c1c", padding: "4px 12px", borderRadius: "20px", fontWeight: 800, fontSize: "0.8rem", marginBottom: "12px" }}>
                <Flame size={14} color="#dc2626" /> PRIORITY 1 TRAUMA DISPATCH
              </div>

              <h2 style={{ fontSize: "1.45rem", fontWeight: 800, color: "#991b1b", marginBottom: "6px" }}>
                🚨 CRITICAL EMERGENCY SOS
              </h2>
              <p style={{ color: "#64748b", fontSize: "0.88rem", marginBottom: "14px" }}>
                Emergency triage requested by patient. Active audio siren broadcasted across on-duty physician terminals.
              </p>

              {/* 3-Minute Response Countdown Banner */}
              <div style={{ 
                background: "#fff1f2", 
                border: "1px solid #fecdd3", 
                borderRadius: "8px", 
                padding: "10px 14px", 
                marginBottom: "18px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                color: "#9f1239",
                fontWeight: 700,
                fontSize: "0.92rem"
              }}>
                <Clock size={18} />
                <span>Response Window: {Math.floor(emergencyCountdown / 60)}:{(emergencyCountdown % 60 < 10 ? "0" : "") + (emergencyCountdown % 60)} remaining</span>
              </div>

              <div className="emerg-caller-box">
                <div><strong>Patient / Caller:</strong> {incomingEmergency.patientName} ({incomingEmergency.patientPhone || "Web Emergency SOS"})</div>
                <div><strong>Trauma Category:</strong> <span style={{ fontWeight: 800, color: "#b91c1c" }}>{incomingEmergency.emergencyCategory}</span></div>
                <div><strong>Reported Distress:</strong> {incomingEmergency.symptoms}</div>
                <div><strong>Location / Landmark:</strong> {incomingEmergency.emergencyLocation || "Provided via SOS"}</div>
                {incomingEmergency.allergies && (Array.isArray(incomingEmergency.allergies) ? incomingEmergency.allergies.length > 0 : Boolean(incomingEmergency.allergies)) && (
                  <div style={{ color: "#b91c1c" }}>
                    <strong>Known Allergies:</strong> {Array.isArray(incomingEmergency.allergies) ? incomingEmergency.allergies.join(", ") : String(incomingEmergency.allergies)}
                  </div>
                )}
                {incomingEmergency.chronicConditions && (Array.isArray(incomingEmergency.chronicConditions) ? incomingEmergency.chronicConditions.length > 0 : Boolean(incomingEmergency.chronicConditions)) && (
                  <div style={{ color: "#b91c1c" }}>
                    <strong>Chronic Conditions:</strong> {Array.isArray(incomingEmergency.chronicConditions) ? incomingEmergency.chronicConditions.join(", ") : String(incomingEmergency.chronicConditions)}
                  </div>
                )}
              </div>

              <div className="emerg-btn-row">
                <button 
                  type="button" 
                  className="btn-accept-emergency"
                  onClick={() => handleAcceptEmergency(incomingEmergency)}
                >
                  ⚡ ACCEPT EMERGENCY & ENTER LIVE TRIAGE
                </button>
                <button 
                  type="button" 
                  className="btn-decline-emergency"
                  onClick={() => setIncomingEmergency(null)}
                >
                  Decline / Currently in Procedure
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================= MODAL 1: 10-MINUTE PRE-CONSULTATION PATIENT RECORD (LIVE DATABASE DATA) ================= */}
        {activeHistoryPatient && (() => {
          const cleanAllergies = getCleanAllergies(activeHistoryPatient.allergies);
          const cleanConditions = getCleanConditions(activeHistoryPatient.chronicConditions);

          return (
            <div className="modal-backdrop" onClick={() => setActiveHistoryPatient(null)}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <div>
                    <h3 className="modal-title">Pre-Consultation Patient Record</h3>
                    <p className="modal-subtitle">Direct live data from patient's registered medical record (24-Hour Testing Timeline)</p>
                  </div>
                  <button type="button" className="drawer-close-btn" onClick={() => setActiveHistoryPatient(null)}>
                    <X size={18} />
                  </button>
                </div>

                <div className="modal-body">
                  {/* Patient Profile Summary */}
                  <div className="history-patient-strip">
                    <div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
                        {activeHistoryPatient.patientName}
                      </div>
                      <div style={{ fontSize: "0.88rem", color: "#64748b" }}>
                        {activeHistoryPatient.patientAge ? `${activeHistoryPatient.patientAge} Years` : "Age not recorded"} • {activeHistoryPatient.patientGender || "Gender not specified"} • Phone: {activeHistoryPatient.patientPhone || "Not provided"}
                      </div>
                      {(activeHistoryPatient.city || activeHistoryPatient.state) && (
                        <div style={{ fontSize: "0.8rem", color: "#64748b", marginTop: "2px" }}>
                          Location: {[activeHistoryPatient.city, activeHistoryPatient.state].filter(Boolean).join(", ")}
                        </div>
                      )}
                    </div>
                    <div className="blood-group-box">
                      <span>Blood Group</span>
                      <strong style={{ color: activeHistoryPatient.patientBloodGroup ? "#dc2626" : "#64748b" }}>
                        {activeHistoryPatient.patientBloodGroup || "Not recorded"}
                      </strong>
                    </div>
                  </div>

                  {/* Clean Allergies & Chronic Conditions Handling (No dummy data) */}
                  <div className="history-details-grid">
                    {/* Allergies Card */}
                    <div 
                      className={`history-detail-card ${cleanAllergies.length > 0 ? 'danger' : 'neutral'}`}
                      style={cleanAllergies.length === 0 ? { background: '#f8fafc', borderColor: '#e2e8f0', color: '#475569' } : {}}
                    >
                      <div className="card-lbl">Known Drug Allergies</div>
                      <div className="card-val" style={cleanAllergies.length === 0 ? { color: '#0f172a', fontWeight: 500 } : {}}>
                        {cleanAllergies.length > 0 
                          ? cleanAllergies.join(', ') 
                          : 'No known allergies reported by patient'}
                      </div>
                    </div>

                    {/* Chronic Conditions Card */}
                    <div 
                      className={`history-detail-card ${cleanConditions.length > 0 ? 'warning' : 'neutral'}`}
                      style={cleanConditions.length === 0 ? { background: '#f8fafc', borderColor: '#e2e8f0', color: '#475569' } : {}}
                    >
                      <div className="card-lbl">Chronic Medical History</div>
                      <div className="card-val" style={cleanConditions.length === 0 ? { color: '#0f172a', fontWeight: 500 } : {}}>
                        {cleanConditions.length > 0 
                          ? cleanConditions.join(', ') 
                          : 'No chronic illnesses reported by patient'}
                      </div>
                    </div>
                  </div>

                  {/* Emergency Contact */}
                  <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "12px 16px", marginBottom: "16px", fontSize: "0.88rem" }}>
                    <strong style={{ color: "#0f172a" }}>Emergency Contact:</strong>{" "}
                    {activeHistoryPatient.emergencyContact?.name ? (
                      <span>
                        {activeHistoryPatient.emergencyContact.name}{" "}
                        ({activeHistoryPatient.emergencyContact.phone || "No phone"})
                        {activeHistoryPatient.emergencyContact.relation ? ` — ${activeHistoryPatient.emergencyContact.relation}` : ""}
                      </span>
                    ) : (
                      <span style={{ color: "#64748b" }}>No emergency contact recorded by patient</span>
                    )}
                  </div>

                  {/* Chief Complaint */}
                  <div className="history-section-panel">
                    <div className="panel-lbl">Current Chief Complaint / Symptoms:</div>
                    <p className="panel-txt">{activeHistoryPatient.symptoms || 'General checkup / no specific complaints noted.'}</p>
                  </div>

                  {/* Clinical Guidance */}
                  <div className="clinical-guidance-pill">
                    <CheckCircle2 size={16} color="#059669" />
                    <span>Review patient baseline before prescribing. Consultation runs on a 24-hour session clock for testing.</span>
                  </div>
                </div>

                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn-enter-consult"
                    onClick={() => {
                      const p = activeHistoryPatient;
                      setActiveHistoryPatient(null);
                      handleEnterConsultation(p);
                    }}
                  >
                    <HeartPulse size={16} /> Open Live Consultation Chat Room
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

        {/* ================= MODAL 2: 1-HOUR LIVE CONSULTATION CHAT ROOM ================= */}
        {activeConsultation && (
          <div className="consult-room-overlay">
            <div className="consult-room-window">
              <div className="consult-room-topbar">
                <div className="consult-patient-meta">
                  <div className="consult-online-dot"></div>
                  <div>
                    <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
                      Consultation with {activeConsultation.patientName}
                    </div>
                    {activeConsultation.isEmergency && (
                      <div style={{ background: "#fee2e2", color: "#991b1b", border: "1px solid #fecaca", padding: "3px 8px", borderRadius: "6px", fontSize: "0.78rem", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: "6px", marginTop: "3px" }}>
                        <Flame size={13} color="#dc2626" />
                        🚨 EMERGENCY SOS: {activeConsultation.emergencyCategory || "Critical Triage"} {activeConsultation.emergencyLocation ? "• " + activeConsultation.emergencyLocation : ""}
                      </div>
                    )}
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "3px" }}>
                      <span style={{ fontSize: "0.84rem", color: "#64748b" }}>
                        {activeConsultation.patientAge ? `${activeConsultation.patientAge}Y` : "Age N/A"} / {activeConsultation.patientGender || "N/A"} • Blood: {activeConsultation.patientBloodGroup || "N/A"}
                      </span>
                      {patientOnline ? (
                        <span className="badge-active-status" style={{ background: "#ecfdf5", color: "#059669", borderColor: "#a7f3d0", padding: "2px 8px", fontSize: "0.75rem" }}>
                          <span className="live-pulsing-badge" style={{ width: "7px", height: "7px" }} /> 🟢 Patient Connected Now
                        </span>
                      ) : (
                        <span className="badge-active-status" style={{ background: "#f8fafc", color: "#64748b", borderColor: "#cbd5e1", padding: "2px 8px", fontSize: "0.75rem" }}>
                          ⚪ Patient Not in Room Yet
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="consult-timer-cluster">
                  <div className="timer-display-pill">
                    <Clock size={16} color="#dc2626" />
                    <span className="timer-digits">{formatTimer(sessionTimer)}</span>
                    <span className="timer-sub">Remaining</span>
                  </div>

                  <button
                    type="button"
                    className="btn-end-session"
                    onClick={handleEndConsultationToRx}
                  >
                    End Chat & Write Prescription
                  </button>

                  <button
                    type="button"
                    className="drawer-close-btn"
                    onClick={() => setActiveConsultation(null)}
                    title="Minimize chat"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Chat Feed */}
              <div className="consult-messages-feed">
                {chatMessages.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "40px 10px", color: "#64748b" }}>
                    <div className="system-chat-pill" style={{ display: "inline-block" }}>
                      Consultation room connected. Start typing below to begin clinical advice.
                    </div>
                  </div>
                ) : (
                  chatMessages.map((msg) => (
                    <div 
                      key={msg.id} 
                      className={`chat-bubble-row ${msg.sender === "doctor" ? "from-me" : msg.sender === "patient" ? "from-other" : "from-system"}`}
                    >
                      {msg.sender === "system" ? (
                        <div className="system-chat-pill">{msg.text}</div>
                      ) : (
                        <div className="chat-msg-bubble">
                          <div className="msg-sender-name">
                            {msg.sender === "doctor" ? `Dr. ${doctor?.name || "Doctor"} (You)` : activeConsultation.patientName}
                          </div>
                          <div className="msg-text-content">{msg.text}</div>
                          <div className="msg-timestamp">{msg.time}</div>
                        </div>
                      )}
                    </div>
                  ))
                )}
                <div ref={chatBottomRef} />
              </div>

              {/* Chat Input */}
              {patientTyping && (
                <div className="live-typing-indicator">
                  <Clock size={12} /> {activeConsultation.patientName} is typing...
                </div>
              )}
              <form onSubmit={handleSendMessage} className="consult-input-strip">
                <input
                  type="text"
                  placeholder="Type clinical advice or response to patient..."
                  className="consult-input-field"
                  value={chatInput}
                  onChange={handleChatInputChange}
                />
                <button type="submit" className="btn-send-message">
                  <Send size={16} /> Send
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ================= MODAL 3: INTEGRATED PRESCRIPTION BUILDER ================= */}
        {activePrescriptionAppt && (
          <div className="modal-backdrop" onClick={() => setActivePrescriptionAppt(null)}>
            <div className="modal-content modal-content-wide" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <div>
                  <h3 className="modal-title">Clinical Prescription Composer</h3>
                  <p className="modal-subtitle">Patient: <strong>{activePrescriptionAppt.patientName}</strong> ({activePrescriptionAppt.patientAge ? `${activePrescriptionAppt.patientAge}y` : ''}, {activePrescriptionAppt.patientGender || ''})</p>
                </div>
                <button type="button" className="drawer-close-btn" onClick={() => setActivePrescriptionAppt(null)}>
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSavePrescription}>
                <div className="modal-body">
                  {/* Diagnosis */}
                  <div className="form-group" style={{ marginBottom: '18px' }}>
                    <label className="form-label">Clinical Diagnosis *</label>
                    <input
                      type="text"
                      required
                      placeholder="Enter clinical diagnosis (e.g. Acute Viral Bronchitis / Gastritis)..."
                      className="form-input"
                      value={rxDiagnosis}
                      onChange={(e) => setRxDiagnosis(e.target.value)}
                    />
                  </div>

                  {/* Medications Table */}
                  <div className="rx-meds-box">
                    <div className="rx-meds-header">
                      <span style={{ fontWeight: 700, fontSize: '0.94rem' }}>Rx - Medications Prescribed *</span>
                      <button
                        type="button"
                        className="btn-add-med"
                        onClick={handleAddMedication}
                      >
                        <Plus size={14} /> Add Medicine Row
                      </button>
                    </div>

                    <div className="meds-table-wrapper">
                      <table className="rx-table">
                        <thead>
                          <tr>
                            <th>Medicine Name</th>
                            <th>Dosage</th>
                            <th>Frequency / Timing</th>
                            <th>Duration</th>
                            <th>Remove</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rxMedications.map((med, idx) => (
                            <tr key={idx}>
                              <td>
                                <input
                                  type="text"
                                  required
                                  placeholder="e.g. Tab. Paracetamol"
                                  className="rx-cell-input"
                                  value={med.name}
                                  onChange={(e) => handleUpdateMedication(idx, 'name', e.target.value)}
                                />
                              </td>
                              <td>
                                <input
                                  type="text"
                                  required
                                  placeholder="e.g. 500mg"
                                  className="rx-cell-input"
                                  value={med.dosage}
                                  onChange={(e) => handleUpdateMedication(idx, 'dosage', e.target.value)}
                                />
                              </td>
                              <td>
                                <input
                                  type="text"
                                  required
                                  placeholder="1-0-1 (After Food)"
                                  className="rx-cell-input"
                                  value={med.frequency}
                                  onChange={(e) => handleUpdateMedication(idx, 'frequency', e.target.value)}
                                />
                              </td>
                              <td>
                                <input
                                  type="text"
                                  required
                                  placeholder="5 Days"
                                  className="rx-cell-input"
                                  value={med.duration}
                                  onChange={(e) => handleUpdateMedication(idx, 'duration', e.target.value)}
                                />
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                <button
                                  type="button"
                                  className="btn-del-med"
                                  onClick={() => handleRemoveMedication(idx)}
                                >
                                  <Trash2 size={14} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Doctor Advice / Diet / Tests */}
                  <div className="form-group" style={{ marginTop: '18px', marginBottom: '16px' }}>
                    <label className="form-label">Doctor's Advice & Instructions</label>
                    <textarea
                      rows={3}
                      placeholder="e.g. Adequate hydration, avoid strenuous exercise, report if symptoms persist..."
                      className="form-input"
                      style={{ resize: 'vertical' }}
                      value={rxAdvice}
                      onChange={(e) => setRxAdvice(e.target.value)}
                    />
                  </div>

                  {/* Next Follow Up */}
                  <div className="form-group">
                    <label className="form-label">Next Follow-Up Date / Advice</label>
                    <input
                      type="text"
                      placeholder="e.g. After 7 days / As needed"
                      className="form-input"
                      value={rxFollowUp}
                      onChange={(e) => setRxFollowUp(e.target.value)}
                    />
                  </div>
                </div>

                <div className="modal-footer">
                  <button
                    type="submit"
                    className="btn-auth-submit"
                    disabled={rxSubmitting}
                  >
                    {rxSubmitting ? 'Issuing Prescription...' : 'Issue Prescription & Generate Report'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ================= MODAL 4: OFFICIAL MEDICAL PRESCRIPTION SLIP ================= */}
        {viewingPrescription && (
          <div className="modal-backdrop" onClick={() => setViewingPrescription(null)}>
            <div className="modal-content modal-content-wide" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <div>
                  <h3 className="modal-title">Official Medical Prescription Slip</h3>
                  <p className="modal-subtitle">Ready for patient download and pharmacy fulfillment</p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    className="btn-print-slip"
                    onClick={() => window.print()}
                  >
                    <Printer size={15} /> Print / Save PDF
                  </button>
                  <button type="button" className="drawer-close-btn" onClick={() => setViewingPrescription(null)}>
                    <X size={18} />
                  </button>
                </div>
              </div>

              <div className="modal-body printable-slip">
                {/* Hospital & Doctor Letterhead */}
                <div className="slip-letterhead">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <img src="/logo.png" alt="MediLink" style={{ width: '40px', height: '40px', objectFit: 'contain' }} />
                    <div>
                      <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a' }}>MediLink Healthcare Systems</h2>
                      <p style={{ fontSize: '0.8rem', color: '#64748b' }}>Central Teleconsultation & Hospital Network • India</p>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1rem', fontWeight: 700, color: '#0284c7' }}>
                      {viewingPrescription.doctorName || doctor?.name}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                      {doctor?.doctorProfile?.specialization || 'Consultant Physician'}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                      Reg: {doctor?.doctorProfile?.licenseNumber || 'NMC-IND-REG'}
                    </div>
                  </div>
                </div>

                <div className="slip-divider"></div>

                {/* Patient Slip Metadata */}
                <div className="slip-patient-grid">
                  <div>
                    <span className="lbl">Patient:</span> <strong>{viewingPrescription.patientName}</strong>
                  </div>
                  <div>
                    <span className="lbl">Date:</span> {new Date(viewingPrescription.issuedAt).toLocaleDateString()}
                  </div>
                  <div>
                    <span className="lbl">Rx Ref ID:</span> <span style={{ fontFamily: 'monospace' }}>#{viewingPrescription._id?.slice(-8)}</span>
                  </div>
                </div>

                {/* Diagnosis */}
                <div className="slip-diagnosis-row">
                  <span className="lbl">Diagnosis:</span>
                  <span className="diag-text">{viewingPrescription.diagnosis}</span>
                </div>

                {/* Medications Table */}
                <div style={{ marginTop: '16px' }}>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>
                    ℞ Medications:
                  </div>
                  <table className="slip-meds-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Medicine</th>
                        <th>Dosage</th>
                        <th>Frequency</th>
                        <th>Duration</th>
                      </tr>
                    </thead>
                    <tbody>
                      {viewingPrescription.medications?.map((m, idx) => (
                        <tr key={idx}>
                          <td>{idx + 1}</td>
                          <td><strong>{m.name}</strong></td>
                          <td>{m.dosage}</td>
                          <td>{m.frequency}</td>
                          <td>{m.duration}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Advice & Instructions */}
                {viewingPrescription.doctorAdvice && (
                  <div className="slip-advice-box">
                    <strong>Doctor's Advice:</strong>
                    <p style={{ marginTop: '4px', fontSize: '0.88rem' }}>{viewingPrescription.doctorAdvice}</p>
                  </div>
                )}

                {/* Next Follow Up & Digital Signature */}
                <div className="slip-footer-row">
                  <div>
                    <span className="lbl">Next Follow-Up:</span> {viewingPrescription.nextFollowUpDate}
                  </div>
                  <div className="slip-signature-box">
                    <div className="sign-line"></div>
                    <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>Digitally Signed by {viewingPrescription.doctorName}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>MediLink Verified Tele-Practitioner</div>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-success-primary"
                  onClick={() => setViewingPrescription(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
