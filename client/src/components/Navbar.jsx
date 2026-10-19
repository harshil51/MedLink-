import React, { useState, useEffect } from 'react';
import { Stethoscope, User, Sparkles } from 'lucide-react';

export default function Navbar({ onDoctorClick, onPatientClick, onHomeClick, activeView }) {
  const [dbStatus, setDbStatus] = useState({ connected: false, text: 'Checking DB...' });

  useEffect(() => {
    // Check backend and MongoDB connection status
    fetch('http://localhost:5001/api/health')
      .then((res) => res.json())
      .then((data) => {
        if (data?.database?.connected) {
          setDbStatus({ connected: true, text: 'MongoDB Connected' });
        } else {
          setDbStatus({ connected: false, text: 'MongoDB Offline' });
        }
      })
      .catch(() => {
        setDbStatus({ connected: false, text: 'Backend Offline' });
      });
  }, []);

  return (
    <header className="navbar">
      <div className="container nav-content">
        {/* Brand Logo & Title */}
        <div 
          className="brand-wrapper" 
          onClick={onHomeClick} 
          role="button"
          tabIndex={0}
        >
          <div className="brand-logo-glow-wrapper">
            <img 
              src="/logo.png" 
              alt="MediLink Logo" 
              className="brand-logo-img" 
            />
          </div>
          <div className="brand-text-col">
            <span className="brand-text">MediLink</span>
            <span className="brand-subtext">Clinical Hub</span>
          </div>
        </div>

        {/* Center Quick Navigation */}
        <nav className="nav-center-links">
          <button 
            type="button" 
            onClick={onHomeClick} 
            className="nav-link nav-link-active" 
          >
            Overview
          </button>
          <a href="#services" className="nav-link">Hospital Services</a>
          <a href="#overview" className="nav-link">Clinical Flow</a>
        </nav>

        {/* Right Actions: DB Status + Doctor & Patient Buttons */}
        <div className="nav-right-actions">
          {/* Live MongoDB Status Indicator */}
          <div 
            className={`db-status-pill ${dbStatus.connected ? 'db-online' : 'db-offline'}`}
            title="Real-time backend database connectivity state"
          >
            <span className="status-beacon-wrap">
              <span className={`status-beacon-ping ${dbStatus.connected ? 'online' : 'offline'}`} />
              <span className={`status-beacon-core ${dbStatus.connected ? 'online' : 'offline'}`} />
            </span>
            <span className="db-status-label">{dbStatus.text}</span>
          </div>

          {/* Doctor Button */}
          <button 
            type="button" 
            className={`btn-nav-user btn-nav-doctor ${activeView === 'doctor_auth' || activeView === 'doctor_dashboard' ? 'active' : ''}`}
            onClick={onDoctorClick}
            title="Doctor Portal"
          >
            <Stethoscope size={16} className="btn-icon-spin" />
            <span>Doctor Portal</span>
          </button>

          {/* Patient Button */}
          <button 
            type="button" 
            className={`btn-nav-user btn-nav-patient ${activeView === 'patient_auth' || activeView === 'patient_dashboard' ? 'active' : ''}`}
            onClick={onPatientClick}
            title="Patient Portal"
          >
            <User size={16} />
            <span>Patient Portal</span>
          </button>
        </div>
      </div>
    </header>
  );
}

