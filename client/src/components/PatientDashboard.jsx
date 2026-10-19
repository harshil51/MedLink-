import React, { useState, useEffect, useRef } from 'react';
import { socket, playNotificationChime, requestNotificationPermission, showDesktopNotification } from '../socket';
import { 
  User, 
  LogOut, 
  HeartPulse, 
  Phone, 
  MapPin, 
  Calendar, 
  Clock, 
  FileText, 
  ShieldCheck, 
  AlertTriangle, 
  Activity, 
  Edit3, 
  Plus, 
  X, 
  CheckCircle2, 
  Send, 
  Printer, 
  Stethoscope,
  ChevronRight,
  ExternalLink,
  Flame,
  ShieldAlert,
  PhoneCall
} from 'lucide-react';

export default function PatientDashboard({ patient, onLogout }) {
  const patientId = patient?.id || patient?._id;

  // Active Patient State
  const [currentPatient, setCurrentPatient] = useState(patient);
  const profile = currentPatient?.patientProfile || {};

  // Appointments State from Database
  const [appointments, setAppointments] = useState([]);
  const [approvedDoctors, setApprovedDoctors] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);

  // Modals
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [activeConsultation, setActiveConsultation] = useState(null); // Consultation Room Modal
  const [viewingPrescription, setViewingPrescription] = useState(null); // Prescription Preview Modal

  // Edit Profile Form State
  const [editFormData, setEditFormData] = useState({
    name: currentPatient?.name || "",
    phone: currentPatient?.phone || "",
    age: profile.age || "",
    gender: profile.gender || "",
    bloodGroup: profile.bloodGroup || "",
    allergies: "",
    chronicConditions: "",
    city: profile.city || "",
    state: profile.state || "",
    emergencyContactName: profile.emergencyContact?.name || "",
    emergencyContactPhone: profile.emergencyContact?.phone || "",
    emergencyContactRelation: profile.emergencyContact?.relation || ""
  });

  // Helper to filter out dummy "none" values from medical lists
  const cleanFilterList = (list) => {
    if (!list) return [];
    const arr = Array.isArray(list) ? list : String(list).split(",");
    return arr
      .map((s) => (typeof s === "string" ? s.trim() : ""))
      .filter((s) => s && !["none", "none reported", "nil", "n/a", "no", "null"].includes(s.toLowerCase()));
  };

  const handleOpenEditProfile = () => {
    const prof = currentPatient?.patientProfile || {};
    const safeAllergies = cleanFilterList(prof.allergies).join(", ");
    const safeConditions = cleanFilterList(prof.chronicConditions).join(", ");

    setEditFormData({
      name: currentPatient?.name || "",
      phone: currentPatient?.phone || "",
      age: prof.age !== null && prof.age !== undefined ? prof.age : "",
      gender: prof.gender || "",
      bloodGroup: prof.bloodGroup || "",
      allergies: safeAllergies,
      chronicConditions: safeConditions,
      city: prof.city || "",
      state: prof.state || "",
      emergencyContactName: prof.emergencyContact?.name || "",
      emergencyContactPhone: prof.emergencyContact?.phone || "",
      emergencyContactRelation: prof.emergencyContact?.relation || ""
    });
    setIsEditProfileOpen(true);
  };
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSuccessMsg, setProfileSuccessMsg] = useState('');

  // Booking Form State
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [bookingSymptoms, setBookingSymptoms] = useState('');
  const [bookingDate, setBookingDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [bookingTime, setBookingTime] = useState('11:00');
  const [bookingLoading, setBookingLoading] = useState(false);

  // Live Consultation State
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [sessionTimer, setSessionTimer] = useState(86400); // 24 hours (Testing mode)
  const [doctorWaitingBanner, setDoctorWaitingBanner] = useState(null);
  const [doctorOnline, setDoctorOnline] = useState(false);
  const [doctorTyping, setDoctorTyping] = useState(false);
  const chatBottomRef = useRef(null);

  // Automatic scroll down to latest chat
  useEffect(() => {
    if (activeConsultation) {
      chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages, activeConsultation, doctorTyping]);

  // Load patient appointments and approved doctors from MongoDB
  const loadPatientData = async () => {
    if (!patientId) return;
    setDataLoading(true);
    try {
      const [apptsRes, docsRes] = await Promise.all([
        fetch(`http://localhost:5001/api/patient/${patientId}/appointments`),
        fetch(`http://localhost:5001/api/patient/doctors`)
      ]);

      const apptsData = await apptsRes.json();
      const docsData = await docsRes.json();

      if (apptsData.success) setAppointments(apptsData.appointments || []);
      if (docsData.success) {
        setApprovedDoctors(docsData.doctors || []);
        if (docsData.doctors?.length > 0 && !selectedDoctorId) {
          setSelectedDoctorId(docsData.doctors[0]._id);
        }
      }
    } catch (err) {
      console.error('Failed to load patient data', err);
    } finally {
      setDataLoading(false);
    }
  };

  useEffect(() => {
    requestNotificationPermission();
  }, []);

  useEffect(() => {
    loadPatientData();
  }, [patientId]);

  // Real-time listener: Doctor enters consultation room
  useEffect(() => {
    const handleDoctorEntered = (data) => {
      console.log("[MediLink Socket] Doctor entered consultation event received:", data);
      const isMine = appointments.some((a) => a._id === data.appointmentId || a.chatRoomId === data.chatRoomId);
      if (isMine) {
        setDoctorWaitingBanner(data);
        playNotificationChime();
        showDesktopNotification(
          `Doctor Ready: ${data.doctorName}`,
          `${data.doctorName} has entered your consultation room! Click to join.`
        );
        setAppointments((prev) =>
          prev.map((a) =>
            a._id === data.appointmentId || a.chatRoomId === data.chatRoomId
              ? { ...a, status: "IN_PROGRESS" }
              : a
          )
        );
      }
    };

    socket.on("doctor_entered_consultation", handleDoctorEntered);
    return () => {
      socket.off("doctor_entered_consultation", handleDoctorEntered);
    };
  }, [appointments]);

  // Session timer countdown
  useEffect(() => {
    if (!activeConsultation) return;
    const interval = setInterval(() => {
      setSessionTimer((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [activeConsultation]);

  // Real-time Room Sync: Connect to room, load history, listen for messages & doctor presence
  useEffect(() => {
    if (!activeConsultation) return;

    const roomId = activeConsultation.chatRoomId;
    const apptId = activeConsultation._id;

    // 1. Join room
    socket.emit("join_room", {
      chatRoomId: roomId,
      appointmentId: apptId,
      userRole: "PATIENT",
      userName: currentPatient?.name || "Patient",
      userId: patientId
    });

    // 2. Fetch existing persistent message history from MongoDB
    fetch(`http://localhost:5001/api/chat/${apptId}/messages`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.messages && data.messages.length > 0) {
          const mapped = data.messages.map((m) => ({
            id: m._id,
            sender: m.senderRole === "PATIENT" ? "patient" : m.senderRole === "DOCTOR" ? "doctor" : "system",
            text: m.text,
            time: new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          }));
          setChatMessages(mapped);
        }
      })
      .catch((err) => console.error("Error loading chat history:", err));

    // 3. Query initial doctor presence
    socket.emit("check_doctor_status", { chatRoomId: roomId });

    const handleDoctorPresence = (data) => {
      setDoctorOnline(Boolean(data.online));
      if (data.online) {
        playNotificationChime();
      }
    };

    const handleReceiveMessage = (msg) => {
      const mappedMsg = {
        id: msg._id || Date.now(),
        sender: msg.senderRole === "PATIENT" ? "patient" : msg.senderRole === "DOCTOR" ? "doctor" : "system",
        text: msg.text,
        time: new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      };
      setChatMessages((prev) => [...prev, mappedMsg]);
      if (msg.senderRole === "DOCTOR") {
        playNotificationChime();
      }
    };

    const handleUserTyping = (data) => {
      if (data.senderRole === "DOCTOR") {
        setDoctorTyping(Boolean(data.isTyping));
      }
    };

    socket.on("doctor_presence", handleDoctorPresence);
    socket.on("receive_message", handleReceiveMessage);
    socket.on("user_typing", handleUserTyping);

    return () => {
      socket.emit("leave_room", { chatRoomId: roomId, userRole: "PATIENT" });
      socket.off("doctor_presence", handleDoctorPresence);
      socket.off("receive_message", handleReceiveMessage);
      socket.off("user_typing", handleUserTyping);
    };
  }, [activeConsultation, patientId, currentPatient]);

  // Save Updated Profile
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setProfileSaving(true);
    setProfileSuccessMsg('');

    try {
      const res = await fetch(`http://localhost:5001/api/patient/${patientId}/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editFormData)
      });

      const data = await res.json();

      if (res.ok) {
        setCurrentPatient(data.patient);
        try {
          localStorage.setItem('medilink_patient', JSON.stringify(data.patient));
        } catch (e) {
          console.error(e);
        }
        setProfileSuccessMsg('Medical baseline & profile updated successfully!');
        setTimeout(() => {
          setIsEditProfileOpen(false);
          setProfileSuccessMsg('');
        }, 1200);
      } else {
        alert(data.message || 'Error updating profile.');
      }
    } catch (err) {
      alert('Unable to save changes to server.');
    } finally {
      setProfileSaving(false);
    }
  };

  // Book 1-Hour Consultation
  const handleBookAppointment = async (e) => {
    e.preventDefault();
    if (!selectedDoctorId) {
      alert('Please select an approved doctor.');
      return;
    }
    setBookingLoading(true);

    try {
      const res = await fetch(`http://localhost:5001/api/patient/appointments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId,
          doctorId: selectedDoctorId,
          symptoms: bookingSymptoms,
          slotDate: bookingDate,
          slotTime: bookingTime
        })
      });

      const data = await res.json();

      if (res.ok) {
        setIsBookingOpen(false);
        setBookingSymptoms('');
        await loadPatientData();
        alert('Appointment successfully booked in the hospital database! It is now visible to the doctor.');
      } else {
        alert(data.message || 'Failed to book appointment.');
      }
    } catch (err) {
      alert('Error connecting to appointment booking server.');
    } finally {
      setBookingLoading(false);
    }
  };

  // Enter Consultation Chat
  const handleEnterConsultation = (appt) => {
    setActiveConsultation(appt);
    setSessionTimer(86400);
    setChatMessages([]);
    setDoctorOnline(false);
  };

  // Send message through WebSocket
  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!chatInput.trim() || !activeConsultation) return;

    socket.emit("send_message", {
      chatRoomId: activeConsultation.chatRoomId,
      appointmentId: activeConsultation._id,
      senderRole: "PATIENT",
      senderName: currentPatient?.name || "Patient",
      text: chatInput.trim()
    });

    socket.emit("typing", {
      chatRoomId: activeConsultation.chatRoomId,
      senderName: currentPatient?.name || "Patient",
      senderRole: "PATIENT",
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
        senderName: currentPatient?.name || "Patient",
        senderRole: "PATIENT",
        isTyping: val.trim().length > 0
      });
    }
  };

  const formatTimer = (secs) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) {
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="doc-portal-root">
      <div className="container" style={{ maxWidth: '1180px', padding: '36px 20px 80px' }}>
        
        {/* ================= 1. PATIENT HEADER BAR ================= */}
        <div className="doc-header-strip">
          <div className="doc-profile-left">
            <div className="doc-badge-avatar" style={{ background: '#e0f2fe', color: '#0284c7' }}>
              <User size={30} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <h1 className="doc-portal-name">{currentPatient?.name || 'Patient'}</h1>
                <span className="badge-active-status" style={{ background: '#e0f2fe', color: '#0369a1', borderColor: '#bae6fd' }}>
                  <ShieldCheck size={13} /> MediLink Registered Patient
                </span>
              </div>
              <p className="doc-portal-credentials">
                <span>{profile.age ? `${profile.age} Years` : "Age not recorded"} • {profile.gender || "Gender not specified"}</span> •{" "}
                <span>Blood: <strong style={{ color: profile.bloodGroup ? "#dc2626" : "#64748b" }}>{profile.bloodGroup || "Not recorded"}</strong></span> •{" "}
                <span><MapPin size={13} style={{ display: "inline", verticalAlign: "middle" }} /> {[profile.city, profile.state].filter(Boolean).join(", ") || "Location not recorded"}</span> •{" "}
                <span>{currentPatient?.phone || "No phone"}</span>
              </p>
            </div>
          </div>

          <div className="doc-header-actions">
            {/* Edit Medical Profile Button */}
            <button 
              type="button" 
              className="btn-pre-review active"
              style={{ width: 'auto', padding: '9px 18px' }}
              onClick={handleOpenEditProfile}
            >
              <Edit3 size={15} />
              Edit Medical Profile
            </button>

            {/* Instant Emergency SOS */}
            <button 
              type="button" 
              className="btn-emergency-action"
              style={{ width: "auto", padding: "9px 16px", fontSize: "0.88rem" }}
              onClick={() => setIsEmergencySOSOpen(true)}
              title="1-Click Emergency SOS Dispatch"
            >
              <Flame size={16} />
              Instant SOS
            </button>

            {/* Book Appointment CTA */}
            <button 
              type="button" 
              className="btn-enter-consult"
              style={{ width: 'auto', padding: '9px 18px' }}
              onClick={() => setIsBookingOpen(true)}
            >
              <Plus size={16} />
              Book Consultation
            </button>

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

        {/* ================= 2. CLINICAL PROFILE SUMMARY ================= */}
        {(() => {
          const cleanAllergiesList = cleanFilterList(profile.allergies);
          const cleanConditionsList = cleanFilterList(profile.chronicConditions);

          return (
            <div className="doc-metrics-strip" style={{ gridTemplateColumns: "repeat(3, 1fr)", marginBottom: "28px" }}>
              {/* Allergies */}
              <div className="doc-metric-card">
                <div 
                  className="metric-icon-circle" 
                  style={cleanAllergiesList.length > 0 
                    ? { background: "#fef2f2", color: "#dc2626" } 
                    : { background: "#f1f5f9", color: "#64748b" }}
                >
                  <AlertTriangle size={22} />
                </div>
                <div>
                  <div style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>
                    Known Drug Allergies
                  </div>
                  <div style={{ fontSize: "1.05rem", fontWeight: 700, color: cleanAllergiesList.length > 0 ? "#b91c1c" : "#334155", marginTop: "2px" }}>
                    {cleanAllergiesList.length > 0 ? cleanAllergiesList.join(", ") : "No known allergies reported"}
                  </div>
                </div>
              </div>

              {/* Chronic Illnesses */}
              <div className="doc-metric-card">
                <div 
                  className="metric-icon-circle" 
                  style={cleanConditionsList.length > 0 
                    ? { background: "#fef3c7", color: "#d97706" } 
                    : { background: "#f1f5f9", color: "#64748b" }}
                >
                  <Activity size={22} />
                </div>
                <div>
                  <div style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>
                    Pre-existing Conditions
                  </div>
                  <div style={{ fontSize: "1.05rem", fontWeight: 700, color: cleanConditionsList.length > 0 ? "#b45309" : "#334155", marginTop: "2px" }}>
                    {cleanConditionsList.length > 0 ? cleanConditionsList.join(", ") : "No chronic illnesses reported"}
                  </div>
                </div>
              </div>

              {/* Emergency Contact */}
              <div className="doc-metric-card">
                <div 
                  className="metric-icon-circle" 
                  style={profile.emergencyContact?.name 
                    ? { background: "#ecfdf5", color: "#059669" } 
                    : { background: "#f1f5f9", color: "#64748b" }}
                >
                  <Phone size={22} />
                </div>
                <div>
                  <div style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>
                    Emergency Contact
                  </div>
                  <div style={{ fontSize: "1rem", fontWeight: 700, color: profile.emergencyContact?.name ? "#0f172a" : "#64748b", marginTop: "2px" }}>
                    {profile.emergencyContact?.name ? `${profile.emergencyContact.name} (${profile.emergencyContact.phone || "No phone"})` : "Not configured"}
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Real-Time Live Notification: Doctor Entered Consultation Room */}
        {doctorWaitingBanner && (
          <div className="live-doctor-alert-banner">
            <div className="live-doctor-alert-left">
              <span className="live-pulsing-badge" />
              <div>
                <strong style={{ fontSize: "1.08rem", color: "#065f46" }}>
                  ${doctorWaitingBanner.doctorName} is waiting in your consultation room!
                </strong>
                <p style={{ margin: "3px 0 0", fontSize: "0.88rem", color: "#047857" }}>
                  Your physician is online and ready for real-time consultation.
                </p>
              </div>
            </div>
            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              <button
                type="button"
                className="btn-join-live-consult"
                onClick={() => {
                  const targetAppt = appointments.find(
                    (a) => a._id === doctorWaitingBanner.appointmentId || a.chatRoomId === doctorWaitingBanner.chatRoomId
                  );
                  if (targetAppt) {
                    handleEnterConsultation(targetAppt);
                  }
                  setDoctorWaitingBanner(null);
                }}
              >
                <HeartPulse size={16} /> Join Consultation Now
              </button>
              <button
                type="button"
                className="drawer-close-btn"
                onClick={() => setDoctorWaitingBanner(null)}
                title="Dismiss"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        )}

        {/* ================= 3. MY 1-HOUR CONSULTATION APPOINTMENTS ================= */}
        <div className="admin-section-box">
          <div className="section-title-strip" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Calendar size={20} color="#0284c7" />
              <h2 className="admin-subheading">
                My Consultation Appointments ({appointments.length})
              </h2>
            </div>
            <button 
              type="button" 
              className="btn-add-med"
              onClick={() => setIsBookingOpen(true)}
            >
              <Plus size={15} /> Book New Appointment
            </button>
          </div>

          {dataLoading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
              Loading appointments from database...
            </div>
          ) : appointments.length === 0 ? (
            <div className="admin-empty-state" style={{ padding: '40px 20px' }}>
              <HeartPulse size={40} color="#10b981" />
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a', margin: '8px 0' }}>
                No Appointments Booked Yet
              </h3>
              <p style={{ maxWidth: '440px', marginBottom: '20px' }}>
                Book a consultation slot with verified doctors. Your medical baseline is shared with the physician across the full 24-hour testing timeline.
              </p>
              <button 
                type="button" 
                className="btn-enter-consult"
                style={{ width: 'auto', padding: '10px 24px' }}
                onClick={() => setIsBookingOpen(true)}
              >
                <Plus size={16} /> Book Your First Appointment
              </button>
            </div>
          ) : (
            <div className="doctors-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Doctor Name & Department</th>
                    <th>Slot Schedule (1 Hour)</th>
                    <th>Reported Symptoms</th>
                    <th>Status</th>
                    <th>Consultation Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {appointments.map((appt) => {
                    const doc = appt.doctorId || {};
                    const isCompleted = appt.status === 'COMPLETED';
                    const isInProgress = appt.status === 'IN_PROGRESS';
                    const hasPrescription = appt.prescriptionId;

                    const start = new Date(appt.scheduledStartTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    const end = new Date(appt.scheduledEndTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    const dateStr = new Date(appt.scheduledStartTime).toLocaleDateString();

                    return (
                      <tr key={appt._id}>
                        <td>
                          <strong>{doc.name || appt.doctorName || 'Dr. Medical Officer'}</strong>
                          <span className="table-sub-detail">
                            {doc.doctorProfile?.specialization || 'Consultant'} • {doc.doctorProfile?.qualification || 'MBBS, MD'}
                          </span>
                        </td>
                        <td>
                          <div>{dateStr}</div>
                          <div className="table-sub-detail" style={{ color: '#0284c7', fontWeight: 600 }}>
                            {start} – {end}
                          </div>
                        </td>
                        <td>
                          <div style={{ maxWidth: '280px', fontSize: '0.88rem' }}>
                            {appt.symptoms}
                          </div>
                        </td>
                        <td style={{ whiteSpace: "nowrap" }}>
                          {appt.isEmergency && (
                            <div style={{ marginBottom: "4px" }}>
                              <span style={{ background: "#fee2e2", color: "#dc2626", border: "1px solid #fecaca", padding: "3px 8px", borderRadius: "6px", fontWeight: 800, fontSize: "0.75rem", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                                <Flame size={12} /> CRITICAL SOS
                              </span>
                            </div>
                          )}
                          {isCompleted ? (
                            <span className="badge-active-status">
                              <CheckCircle2 size={13} /> Completed
                            </span>
                          ) : isInProgress ? (
                            <span className="status-badge-live">
                              ● Live Session
                            </span>
                          ) : (
                            <span className="status-badge-booked">
                              {appt.isEmergency ? "Pending Doctor Claim" : "Scheduled"}
                            </span>
                          )}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            {isCompleted && hasPrescription ? (
                              <button
                                type="button"
                                className="btn-preview-slip"
                                onClick={() => setViewingPrescription(appt.prescriptionId)}
                              >
                                <FileText size={14} /> Download Prescription (PDF)
                              </button>
                            ) : (
                              <button
                                type="button"
                                className="btn-enter-consult"
                                style={{ width: 'auto', padding: '8px 16px', fontSize: '0.86rem' }}
                                onClick={() => handleEnterConsultation(appt)}
                              >
                                <HeartPulse size={15} /> Enter Chat Room
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ================= MODAL 1: EDIT MEDICAL BASELINE & PROFILE ================= */}
        {isEditProfileOpen && (
          <div className="modal-backdrop" onClick={() => setIsEditProfileOpen(false)}>
            <div className="modal-content modal-content-wide" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <div>
                  <h3 className="modal-title">Edit Patient Medical Profile</h3>
                  <p className="modal-subtitle">Keep your medical baseline updated for doctors during consultations</p>
                </div>
                <button type="button" className="drawer-close-btn" onClick={() => setIsEditProfileOpen(false)}>
                  <X size={18} />
                </button>
              </div>

              {profileSuccessMsg && (
                <div className="admin-success-banner" style={{ margin: '16px 24px 0' }}>
                  <CheckCircle2 size={18} color="#059669" />
                  <span>{profileSuccessMsg}</span>
                </div>
              )}

              <form onSubmit={handleSaveProfile}>
                <div className="modal-body">
                  <div className="form-grid-2">
                    {/* Full Name */}
                    <div className="form-group">
                      <label className="form-label">Full Name</label>
                      <input
                        type="text"
                        required
                        className="form-input"
                        value={editFormData.name}
                        onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                      />
                    </div>

                    {/* Contact Phone */}
                    <div className="form-group">
                      <label className="form-label">Contact Phone</label>
                      <input
                        type="tel"
                        required
                        className="form-input"
                        value={editFormData.phone}
                        onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                      />
                    </div>

                    {/* Age */}
                    <div className="form-group">
                      <label className="form-label">Age</label>
                      <input
                        type="number"
                        min="1"
                        max="120"
                        placeholder="Optional (e.g. 28)"
                        className="form-input"
                        value={editFormData.age}
                        onChange={(e) => setEditFormData({ ...editFormData, age: e.target.value })}
                      />
                    </div>

                    {/* Gender */}
                    <div className="form-group">
                      <label className="form-label">Gender</label>
                      <select
                        className="form-input form-select"
                        value={editFormData.gender}
                        onChange={(e) => setEditFormData({ ...editFormData, gender: e.target.value })}
                      >
                        <option value="">Select Gender</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    {/* Blood Group */}
                    <div className="form-group">
                      <label className="form-label">Blood Group</label>
                      <select
                        className="form-input form-select"
                        value={editFormData.bloodGroup}
                        onChange={(e) => setEditFormData({ ...editFormData, bloodGroup: e.target.value })}
                      >
                        <option value="">Select Blood Group</option>
                        <option value="A+">A+</option>
                        <option value="A-">A-</option>
                        <option value="B+">B+</option>
                        <option value="B-">B-</option>
                        <option value="AB+">AB+</option>
                        <option value="AB-">AB-</option>
                        <option value="O+">O+</option>
                        <option value="O-">O-</option>
                      </select>
                    </div>

                    {/* City */}
                    <div className="form-group">
                      <label className="form-label">City & State</label>
                      <input
                        type="text"
                        className="form-input"
                        value={editFormData.city}
                        onChange={(e) => setEditFormData({ ...editFormData, city: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Drug Allergies */}
                  <div className="form-group" style={{ marginTop: '16px' }}>
                    <label className="form-label">Known Drug or Food Allergies (Comma separated)</label>
                    <input
                      type="text"
                      placeholder="e.g. Penicillin, Sulfa, Peanuts"
                      className="form-input"
                      value={editFormData.allergies}
                      onChange={(e) => setEditFormData({ ...editFormData, allergies: e.target.value })}
                    />
                  </div>

                  {/* Chronic Conditions */}
                  <div className="form-group">
                    <label className="form-label">Chronic Illnesses / Conditions (Comma separated)</label>
                    <input
                      type="text"
                      placeholder="e.g. Hypertension, Diabetes, Thyroid"
                      className="form-input"
                      value={editFormData.chronicConditions}
                      onChange={(e) => setEditFormData({ ...editFormData, chronicConditions: e.target.value })}
                    />
                  </div>

                  {/* Emergency Contact */}
                  <div className="form-grid-2" style={{ marginTop: '10px' }}>
                    <div className="form-group">
                      <label className="form-label">Emergency Contact Name</label>
                      <input
                        type="text"
                        className="form-input"
                        value={editFormData.emergencyContactName}
                        onChange={(e) => setEditFormData({ ...editFormData, emergencyContactName: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Emergency Contact Phone</label>
                      <input
                        type="tel"
                        className="form-input"
                        value={editFormData.emergencyContactPhone}
                        onChange={(e) => setEditFormData({ ...editFormData, emergencyContactPhone: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <div className="modal-footer">
                  <button
                    type="submit"
                    className="btn-auth-submit"
                    style={{ width: 'auto', padding: '10px 24px' }}
                    disabled={profileSaving}
                  >
                    {profileSaving ? 'Saving Changes...' : 'Save Updated Profile'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ================= MODAL 2: BOOK 1-HOUR CONSULTATION ================= */}
        {isBookingOpen && (
          <div className="modal-backdrop" onClick={() => setIsBookingOpen(false)}>
            <div className="modal-content modal-content-wide" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <div>
                  <h3 className="modal-title">Book 1-Hour Teleconsultation</h3>
                  <p className="modal-subtitle">Choose an approved doctor from the hospital registry</p>
                </div>
                <button type="button" className="drawer-close-btn" onClick={() => setIsBookingOpen(false)}>
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleBookAppointment}>
                <div className="modal-body">
                  {/* Select Doctor */}
                  <div className="form-group" style={{ marginBottom: '18px' }}>
                    <label className="form-label">Select Consulting Physician *</label>
                    {approvedDoctors.length === 0 ? (
                      <div className="auth-alert auth-alert-pending">
                        <span>No approved doctors available in the database currently. Please approve doctors from the Admin portal.</span>
                      </div>
                    ) : (
                      <select
                        className="form-input form-select"
                        required
                        value={selectedDoctorId}
                        onChange={(e) => setSelectedDoctorId(e.target.value)}
                      >
                        {approvedDoctors.map((doc) => (
                          <option key={doc._id} value={doc._id}>
                            Dr. {doc.name?.replace(/^Dr\.\s*/i, '')} — {doc.doctorProfile?.specialization} ({doc.doctorProfile?.qualification || 'MBBS'})
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* Date & Time Grid */}
                  <div className="form-grid-2" style={{ marginBottom: '18px' }}>
                    <div className="form-group">
                      <label className="form-label">Appointment Date *</label>
                      <input
                        type="date"
                        required
                        className="form-input"
                        value={bookingDate}
                        onChange={(e) => setBookingDate(e.target.value)}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Consultation Slot Start Time (24-Hour Timeline) *</label>
                      <select
                        className="form-input form-select"
                        value={bookingTime}
                        onChange={(e) => setBookingTime(e.target.value)}
                      >
                        <option value="00:00">12:00 AM – 01:00 AM (Night)</option>
                        <option value="01:00">01:00 AM – 02:00 AM (Night)</option>
                        <option value="02:00">02:00 AM – 03:00 AM (Night)</option>
                        <option value="03:00">03:00 AM – 04:00 AM (Early Morning)</option>
                        <option value="04:00">04:00 AM – 05:00 AM (Early Morning)</option>
                        <option value="05:00">05:00 AM – 06:00 AM (Early Morning)</option>
                        <option value="06:00">06:00 AM – 07:00 AM (Morning)</option>
                        <option value="07:00">07:00 AM – 08:00 AM (Morning)</option>
                        <option value="08:00">08:00 AM – 09:00 AM (Morning)</option>
                        <option value="09:00">09:00 AM – 10:00 AM (Morning)</option>
                        <option value="10:00">10:00 AM – 11:00 AM (Morning)</option>
                        <option value="11:00">11:00 AM – 12:00 PM (Midday)</option>
                        <option value="12:00">12:00 PM – 01:00 PM (Afternoon)</option>
                        <option value="13:00">01:00 PM – 02:00 PM (Afternoon)</option>
                        <option value="14:00">02:00 PM – 03:00 PM (Afternoon)</option>
                        <option value="15:00">03:00 PM – 04:00 PM (Afternoon)</option>
                        <option value="16:00">04:00 PM – 05:00 PM (Evening)</option>
                        <option value="17:00">05:00 PM – 06:00 PM (Evening)</option>
                        <option value="18:00">06:00 PM – 07:00 PM (Evening)</option>
                        <option value="19:00">07:00 PM – 08:00 PM (Night)</option>
                        <option value="20:00">08:00 PM – 09:00 PM (Night)</option>
                        <option value="21:00">09:00 PM – 10:00 PM (Night)</option>
                        <option value="22:00">10:00 PM – 11:00 PM (Night)</option>
                        <option value="23:00">11:00 PM – 12:00 AM (Night)</option>
                      </select>
                    </div>
                  </div>

                  {/* Chief Complaint / Symptoms */}
                  <div className="form-group" style={{ marginBottom: '18px' }}>
                    <label className="form-label">Chief Complaint & Symptoms *</label>
                    <textarea
                      rows={3}
                      required
                      placeholder="Describe your health symptoms, duration, and any discomfort in detail..."
                      className="form-input"
                      style={{ resize: 'vertical' }}
                      value={bookingSymptoms}
                      onChange={(e) => setBookingSymptoms(e.target.value)}
                    />
                  </div>

                  {/* Pre-Consultation Notice */}
                  <div className="clinical-guidance-pill">
                    <CheckCircle2 size={16} color="#059669" />
                    <span>Your registered allergies and medical history are accessible to the doctor across the full 24-hour timeline for testing.</span>
                  </div>
                </div>

                <div className="modal-footer">
                  <button
                    type="submit"
                    className="btn-auth-submit"
                    style={{ width: 'auto', padding: '11px 28px' }}
                    disabled={bookingLoading || approvedDoctors.length === 0}
                  >
                    {bookingLoading ? 'Confirming Booking...' : 'Confirm 1-Hour Consultation'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ================= MODAL 3: SYNCHRONIZED CONSULTATION CHAT ROOM ================= */}
        {activeConsultation && (
          <div className="consult-room-overlay">
            <div className="consult-room-window">
              <div className="consult-room-topbar">
                <div className="consult-patient-meta">
                  <div className="consult-online-dot"></div>
                  <div>
                    <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
                      Consultation with {activeConsultation.doctorId?.name || 'Doctor'}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "3px" }}>
                      <span style={{ fontSize: "0.84rem", color: "#64748b" }}>
                        {activeConsultation.doctorId?.doctorProfile?.specialization || "Clinical Specialist"}
                      </span>
                      {doctorOnline ? (
                        <span className="badge-active-status" style={{ background: "#ecfdf5", color: "#059669", borderColor: "#a7f3d0", padding: "2px 8px", fontSize: "0.75rem" }}>
                          <span className="live-pulsing-badge" style={{ width: "7px", height: "7px" }} /> 🟢 Doctor Online Now
                        </span>
                      ) : (
                        <span className="badge-active-status" style={{ background: "#f8fafc", color: "#64748b", borderColor: "#cbd5e1", padding: "2px 8px", fontSize: "0.75rem" }}>
                          ⚪ Waiting for Doctor to enter room...
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
                    className="drawer-close-btn"
                    onClick={() => setActiveConsultation(null)}
                    title="Close chat"
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
                      Consultation room connected. Start typing below to chat with your physician.
                    </div>
                  </div>
                ) : (
                  chatMessages.map((msg) => (
                    <div 
                      key={msg.id} 
                      className={`chat-bubble-row ${msg.sender === "patient" ? "from-me" : msg.sender === "doctor" ? "from-other" : "from-system"}`}
                    >
                      {msg.sender === "system" ? (
                        <div className="system-chat-pill">{msg.text}</div>
                      ) : (
                        <div className="chat-msg-bubble">
                          <div className="msg-sender-name">
                            {msg.sender === "patient" ? `${currentPatient?.name || "You"} (You)` : `Dr. ${activeConsultation.doctorId?.name || "Doctor"}`}
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
              {doctorTyping && (
                <div className="live-typing-indicator">
                  <Clock size={12} /> Doctor is typing...
                </div>
              )}
              <form onSubmit={handleSendMessage} className="consult-input-strip">
                <input
                  type="text"
                  placeholder="Type message to the doctor..."
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

        {/* ================= MODAL 4: VIEW & PRINT PRESCRIPTION REPORT ================= */}
        {viewingPrescription && (
          <div className="modal-backdrop" onClick={() => setViewingPrescription(null)}>
            <div className="modal-content modal-content-wide" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <div>
                  <h3 className="modal-title">Official Medical Prescription Slip</h3>
                  <p className="modal-subtitle">Issued by your consulting doctor • Valid for pharmacy purchase</p>
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
                {/* Hospital Letterhead */}
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
                      {viewingPrescription.doctorName}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                      Consultant Physician
                    </div>
                  </div>
                </div>

                <div className="slip-divider"></div>

                {/* Patient Metadata */}
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
                    ℞ Prescribed Medicines:
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

                {/* Advice */}
                {viewingPrescription.doctorAdvice && (
                  <div className="slip-advice-box">
                    <strong>Doctor's Advice:</strong>
                    <p style={{ marginTop: '4px', fontSize: '0.88rem' }}>{viewingPrescription.doctorAdvice}</p>
                  </div>
                )}

                {/* Follow-up & Digital Signature */}
                <div className="slip-footer-row">
                  <div>
                    <span className="lbl">Follow-Up:</span> {viewingPrescription.nextFollowUpDate}
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
