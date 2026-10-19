import React from 'react';
import { 
  Calendar, 
  ShieldCheck, 
  Clock, 
  FileCheck2, 
  ArrowRight, 
  Activity, 
  Stethoscope, 
  Flame, 
  Sparkles,
  HeartPulse
} from 'lucide-react';

export default function Hero({ onPatientClick, onDoctorClick }) {
  return (
    <section className="hero-section" id="overview">
      <div className="container">
        {/* Glow Header Badge */}
        <div className="hero-pill-badge">
          <span className="live-radar-dot">
            <span className="live-radar-ping"></span>
            <span className="live-radar-core"></span>
          </span>
          <HeartPulse size={16} className="hero-pulse-icon" />
          <span>Integrated Healthcare & Virtual Teleconsultation Portal</span>
        </div>

        {/* Main Title with Animated Gradient */}
        <h1 className="hero-title">
          Smart Hospital Care, <br />
          <span className="hero-highlight">Instant Consultations & Triage.</span>
        </h1>

        {/* Description */}
        <p className="hero-description">
          MediLink seamlessly unites patients, verified medical doctors, and hospital administration. 
          Experience strict 1-hour consultation slots, 10-minute pre-clinical history reviews, instant digital 
          prescriptions, and 1-click rapid emergency support.
        </p>

        {/* Interactive Hero CTAs */}
        <div className="hero-cta-group">
          <button 
            type="button" 
            className="hero-btn-primary"
            onClick={onPatientClick}
          >
            <span>Book Patient Consultation</span>
            <ArrowRight size={18} className="hero-btn-icon-slide" />
          </button>

          <button 
            type="button" 
            className="hero-btn-secondary"
            onClick={onDoctorClick}
          >
            <Stethoscope size={18} className="hero-btn-icon-pop" />
            <span>Doctor Workspace</span>
          </button>
        </div>

        {/* Quick Highlights / Stats Strip with Hover Glow and Icons */}
        <div className="hero-stats-strip">
          <div className="stat-item stat-item-blue">
            <div className="stat-icon-wrap blue">
              <Clock size={20} />
            </div>
            <div className="stat-content">
              <span className="stat-value text-blue">1-Hour</span>
              <span className="stat-label">Synchronized Consultation Slots</span>
            </div>
          </div>

          <div className="stat-item stat-item-teal">
            <div className="stat-icon-wrap teal">
              <FileCheck2 size={20} />
            </div>
            <div className="stat-content">
              <span className="stat-value text-teal">10 Mins</span>
              <span className="stat-label">Pre-Consult Medical History Access</span>
            </div>
          </div>

          <div className="stat-item stat-item-emerald">
            <div className="stat-icon-wrap emerald">
              <ShieldCheck size={20} />
            </div>
            <div className="stat-content">
              <span className="stat-value text-emerald">100%</span>
              <span className="stat-label">Admin-Verified Medical Licenses</span>
            </div>
          </div>

          <div className="stat-item stat-item-rose">
            <div className="stat-icon-wrap rose">
              <Flame size={20} />
            </div>
            <div className="stat-content">
              <span className="stat-value text-rose">Instant</span>
              <span className="stat-label">1-Click Emergency Auto-Routing</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

