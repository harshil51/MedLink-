import React, { useState } from 'react';
import { 
  User, 
  Mail, 
  Lock, 
  Phone, 
  HeartPulse, 
  AlertCircle, 
  ArrowLeft, 
  ShieldCheck, 
  Activity, 
  Droplet, 
  MapPin, 
  UserPlus, 
  LogIn
} from 'lucide-react';

export default function PatientAuth({ onBackToHome, onPatientLoginSuccess }) {
  // 'login' | 'register'
  const [currentView, setCurrentView] = useState('login');

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Register form state (India-specific)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    age: "",
    gender: "",
    bloodGroup: "",
    allergies: "",
    chronicConditions: "",
    city: "",
    state: "",
    emergencyContactName: "",
    emergencyContactRelation: "",
    emergencyContactPhone: ""
  });
  const [registerLoading, setRegisterLoading] = useState(false);
  const [registerError, setRegisterError] = useState('');

  // Handle Login
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);

    try {
      const res = await fetch('http://localhost:5001/api/auth/patient/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword })
      });

      const data = await res.json();

      if (!res.ok) {
        setLoginError(data.message || 'Login failed. Please verify credentials.');
      } else {
        if (onPatientLoginSuccess) {
          onPatientLoginSuccess(data.patient);
        }
      }
    } catch (err) {
      setLoginError('Unable to connect to server. Please try again.');
    } finally {
      setLoginLoading(false);
    }
  };

  // Handle Registration
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setRegisterError('');
    setRegisterLoading(true);

    try {
      const res = await fetch('http://localhost:5001/api/auth/patient/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await res.json();

      if (!res.ok) {
        setRegisterError(data.message || 'Registration failed. Please review the form.');
      } else {
        // Immediate Zero-Friction Auto-Login for Patients!
        if (onPatientLoginSuccess) {
          onPatientLoginSuccess(data.patient);
        }
      }
    } catch (err) {
      setRegisterError('Unable to connect to server. Please try again.');
    } finally {
      setRegisterLoading(false);
    }
  };

  return (
    <div className="auth-page-wrapper">
      <div className="auth-container">
        
        {/* Navigation Back Link */}
        <button 
          type="button" 
          className="auth-back-btn" 
          onClick={onBackToHome}
        >
          <ArrowLeft size={16} />
          Back to MediLink Home
        </button>

        {/* ----------------- VIEW 1: PATIENT LOGIN ----------------- */}
        {currentView === 'login' && (
          <div className="auth-card">
            <div className="auth-header">
              <div className="auth-icon-badge" style={{ background: '#e0f2fe', color: '#0284c7' }}>
                <User size={28} />
              </div>
              <h2 className="auth-title">Patient Portal Login</h2>
              <p className="auth-subtitle">
                Access your consultation history, upcoming 1-hour slots, and digital prescriptions.
              </p>
            </div>

            {loginError && (
              <div className="auth-alert auth-alert-error">
                <AlertCircle size={18} style={{ flexShrink: 0 }} />
                <span>{loginError}</span>
              </div>
            )}

            <form onSubmit={handleLoginSubmit} className="auth-form">
              <div className="form-group">
                <label className="form-label">Registered Email</label>
                <div className="input-wrapper">
                  <Mail size={18} className="input-icon" />
                  <input
                    type="email"
                    required
                    placeholder="amit.verma@gmail.com"
                    className="form-input"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Password</label>
                <div className="input-wrapper">
                  <Lock size={18} className="input-icon" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    className="form-input"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                  />
                </div>
              </div>

              <button 
                type="submit" 
                className="btn-auth-submit"
                disabled={loginLoading}
              >
                <LogIn size={18} />
                {loginLoading ? 'Authenticating...' : 'Sign In as Patient'}
              </button>
            </form>

            <div className="auth-footer-link-group">
              <p className="auth-switch-text">
                New to MediLink?{' '}
                <button
                  type="button"
                  className="auth-link-btn"
                  onClick={() => {
                    setLoginError('');
                    setCurrentView('register');
                  }}
                >
                  Create Patient Account
                </button>
              </p>
            </div>
          </div>
        )}

        {/* ----------------- VIEW 2: PATIENT REGISTRATION ----------------- */}
        {currentView === 'register' && (
          <div className="auth-card auth-card-wide">
            <div className="auth-header">
              <div className="auth-icon-badge" style={{ background: '#d1fae5', color: '#059669' }}>
                <HeartPulse size={28} />
              </div>
              <h2 className="auth-title">Patient Registration</h2>
              <p className="auth-subtitle">
                Enter your demographics and health baseline to enable accurate pre-consultation diagnosis.
              </p>
            </div>

            {registerError && (
              <div className="auth-alert auth-alert-error">
                <AlertCircle size={18} style={{ flexShrink: 0 }} />
                <span>{registerError}</span>
              </div>
            )}

            <form onSubmit={handleRegisterSubmit} className="auth-form">
              {/* SECTION: PERSONAL DEMOGRAPHICS */}
              <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0284c7', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                1. Personal Details
              </div>

              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">Full Name *</label>
                  <div className="input-wrapper">
                    <User size={18} className="input-icon" />
                    <input
                      type="text"
                      required
                      placeholder="Amit Verma"
                      className="form-input"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Email Address *</label>
                  <div className="input-wrapper">
                    <Mail size={18} className="input-icon" />
                    <input
                      type="email"
                      required
                      placeholder="amit.verma@gmail.com"
                      className="form-input"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Password *</label>
                  <div className="input-wrapper">
                    <Lock size={18} className="input-icon" />
                    <input
                      type="password"
                      required
                      placeholder="Create a strong password"
                      className="form-input"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Contact Mobile (+91) *</label>
                  <div className="input-wrapper">
                    <Phone size={18} className="input-icon" />
                    <input
                      type="tel"
                      required
                      placeholder="+91 98765 43210"
                      className="form-input"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Age *</label>
                  <input
                    type="number"
                    min="1"
                    max="120"
                    required
                    placeholder="34"
                    className="form-input"
                    value={formData.age}
                    onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Gender *</label>
                  <select
                    className="form-input form-select"
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  >
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              {/* SECTION: CLINICAL BASELINE */}
              <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0284c7', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '10px' }}>
                2. Health & Medical Baseline (For Pre-Consultation Review)
              </div>

              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">Blood Group (Optional)</label>
                  <select
                    className="form-input form-select"
                    value={formData.bloodGroup}
                    onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })}
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

                <div className="form-group">
                  <label className="form-label">City & State (India)</label>
                  <div className="input-wrapper">
                    <MapPin size={18} className="input-icon" />
                    <input
                      type="text"
                      placeholder="Ahmedabad, Gujarat"
                      className="form-input"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Known Drug or Food Allergies</label>
                <input
                  type="text"
                  placeholder="e.g. Penicillin, Sulfa drugs, Peanuts, None"
                  className="form-input"
                  value={formData.allergies}
                  onChange={(e) => setFormData({ ...formData, allergies: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Pre-existing / Chronic Illnesses</label>
                <input
                  type="text"
                  placeholder="e.g. Hypertension, Type 2 Diabetes, Asthma, None"
                  className="form-input"
                  value={formData.chronicConditions}
                  onChange={(e) => setFormData({ ...formData, chronicConditions: e.target.value })}
                />
              </div>

              {/* SECTION: EMERGENCY CONTACT */}
              <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0284c7', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '10px' }}>
                3. Emergency Contact Person
              </div>

              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">Contact Person Name</label>
                  <input
                    type="text"
                    placeholder="Priya Verma"
                    className="form-input"
                    value={formData.emergencyContactName}
                    onChange={(e) => setFormData({ ...formData, emergencyContactName: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Emergency Phone</label>
                  <input
                    type="tel"
                    placeholder="+91 98765 11223"
                    className="form-input"
                    value={formData.emergencyContactPhone}
                    onChange={(e) => setFormData({ ...formData, emergencyContactPhone: e.target.value })}
                  />
                </div>
              </div>

              <div className="verification-notice-pill">
                <ShieldCheck size={16} color="#059669" />
                <span>Zero waiting period: Your account is activated instantly with immediate consultation access.</span>
              </div>

              <button 
                type="submit" 
                className="btn-auth-submit"
                disabled={registerLoading}
              >
                <UserPlus size={18} />
                {registerLoading ? 'Creating Account...' : 'Complete Patient Registration'}
              </button>
            </form>

            <div className="auth-footer-link-group">
              <p className="auth-switch-text">
                Already registered as a patient?{' '}
                <button
                  type="button"
                  className="auth-link-btn"
                  onClick={() => {
                    setRegisterError('');
                    setCurrentView('login');
                  }}
                >
                  Sign in here
                </button>
              </p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
