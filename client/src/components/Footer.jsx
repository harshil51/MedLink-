import React from 'react';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-top">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <img 
                src="/logo.png" 
                alt="MediLink Logo" 
                style={{ height: '38px', width: 'auto', objectFit: 'contain' }}
              />
              <span style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a' }}>MediLink India</span>
            </div>
            <p style={{ maxWidth: '380px', color: '#64748b', fontSize: '0.9rem' }}>
              Integrated clinical scheduling, teleconsultations, and rapid emergency triage designed for patient safety and physician workflow.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '50px', flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: '12px', fontSize: '0.92rem' }}>Platform</div>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.88rem', color: '#64748b' }}>
                <li>Patient Portal</li>
                <li>Doctor Hub</li>
                <li>Admin Governance</li>
                <li>Emergency Triage</li>
              </ul>
            </div>
            <div>
              <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: '12px', fontSize: '0.92rem' }}>National Helpline (India)</div>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.88rem', color: '#64748b' }}>
                <li>Ambulance: 108 / 102</li>
                <li>National Emergency: 112</li>
                <li>ER Trauma Desk: 1800-437-6334</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <div>
            &copy; {new Date().getFullYear()} MediLink Healthcare Systems. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
}
