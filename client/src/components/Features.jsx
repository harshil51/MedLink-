import React from 'react';
import { UserCheck, Stethoscope, ShieldAlert, Sparkles, Check } from 'lucide-react';

export default function Features() {
  return (
    <section className="features-section" id="services">
      <div className="container">
        <div className="section-header">
          <div className="section-tag-wrap">
            <Sparkles size={14} className="section-tag-sparkle" />
            <span className="section-tag">Core Ecosystem</span>
          </div>
          <h2 className="section-title">Designed for Modern Clinical Excellence</h2>
          <p className="section-subtitle">A synchronized tri-portal architecture engineered for speed, diagnostic precision, and safety.</p>
        </div>

        <div className="features-grid">
          {/* Card 1: Patient Care Module */}
          <div className="feature-card feature-card-patient">
            <div className="feature-card-shine" />
            <div className="feature-icon-box icon-box-blue">
              <UserCheck size={28} />
            </div>
            <div className="feature-badge-tag blue-tag">Patient Experience</div>
            <h3 className="feature-title">Patient Portal</h3>
            <p className="feature-text">
              Comprehensive health profiles with baseline medical tracking, hassle-free 1-hour appointment booking, and scheduled live chat rooms.
            </p>
            <ul className="feature-points">
              <li>
                <span className="check-icon-circle blue-check">
                  <Check size={12} strokeWidth={3} />
                </span> 
                Profile & allergy history management
              </li>
              <li>
                <span className="check-icon-circle blue-check">
                  <Check size={12} strokeWidth={3} />
                </span> 
                Book available 1-hour slots
              </li>
              <li>
                <span className="check-icon-circle blue-check">
                  <Check size={12} strokeWidth={3} />
                </span> 
                Real-time chat with active timer
              </li>
              <li>
                <span className="check-icon-circle blue-check">
                  <Check size={12} strokeWidth={3} />
                </span> 
                Instant PDF prescription download
              </li>
            </ul>
          </div>

          {/* Card 2: Doctor Practice Module */}
          <div className="feature-card feature-card-doctor">
            <div className="feature-card-shine" />
            <div className="feature-icon-box icon-box-emerald">
              <Stethoscope size={28} />
            </div>
            <div className="feature-badge-tag emerald-tag">Physician Workspace</div>
            <h3 className="feature-title">Doctor Workspace</h3>
            <p className="feature-text">
              Secure onboarding with license certification uploads, pre-consultation medical history review, and integrated digital prescription builder.
            </p>
            <ul className="feature-points">
              <li>
                <span className="check-icon-circle emerald-check">
                  <Check size={12} strokeWidth={3} />
                </span> 
                Admin verified medical license
              </li>
              <li>
                <span className="check-icon-circle emerald-check">
                  <Check size={12} strokeWidth={3} />
                </span> 
                10-minute pre-consult record review
              </li>
              <li>
                <span className="check-icon-circle emerald-check">
                  <Check size={12} strokeWidth={3} />
                </span> 
                Clock-bound consultation chat
              </li>
              <li>
                <span className="check-icon-circle emerald-check">
                  <Check size={12} strokeWidth={3} />
                </span> 
                Direct prescription generator
              </li>
            </ul>
          </div>

          {/* Card 3: Emergency Triage Hub */}
          <div className="feature-card feature-card-emergency">
            <div className="feature-card-shine" />
            <div className="feature-icon-box icon-box-rose">
              <ShieldAlert size={28} />
            </div>
            <div className="feature-badge-tag rose-tag">24/7 Rapid Triage</div>
            <h3 className="feature-title">1-Click Emergency Triage</h3>
            <p className="feature-text">
              Frictionless emergency triage accessible to all visitors. Instant connection to available on-duty doctors with automated escalation.
            </p>
            <ul className="feature-points">
              <li>
                <span className="check-icon-circle rose-check">
                  <Check size={12} strokeWidth={3} />
                </span> 
                Zero-registration guest access
              </li>
              <li>
                <span className="check-icon-circle rose-check">
                  <Check size={12} strokeWidth={3} />
                </span> 
                Auto-routing to free/idle doctors
              </li>
              <li>
                <span className="check-icon-circle rose-check">
                  <Check size={12} strokeWidth={3} />
                </span> 
                10-15 min rapid triage window
              </li>
              <li>
                <span className="check-icon-circle rose-check">
                  <Check size={12} strokeWidth={3} />
                </span> 
                Immediate hospital hotline fallback
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

