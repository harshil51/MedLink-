import React, { useState } from 'react';
import { 
  Stethoscope, 
  Mail, 
  Lock, 
  User, 
  Phone, 
  Award, 
  Briefcase, 
  Building2, 
  FileCheck2, 
  CheckCircle2, 
  Clock, 
  ArrowLeft, 
  AlertCircle,
  ShieldCheck,
  Upload,
  FileText,
  X
} from 'lucide-react';

export default function DoctorAuth({ onBackToHome, onDoctorLoginSuccess }) {
  // 'login' | 'register' | 'success'
  const [currentView, setCurrentView] = useState('login');

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [loginPendingInfo, setLoginPendingInfo] = useState('');

  // Register form state (India-specific)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    specialization: 'General Medicine',
    licenseNumber: '',
    yearsOfExperience: '',
    qualification: 'MBBS, MD',
    hospitalAffiliation: ''
  });

  // Certificate file state
  const [certificateFile, setCertificateFile] = useState(null);
  const [certificateError, setCertificateError] = useState('');

  const [registerLoading, setRegisterLoading] = useState(false);
  const [registerError, setRegisterError] = useState('');

  // Registered doctor details for the single success page
  const [registeredDoctor, setRegisteredDoctor] = useState(null);

  // Handle Login Submit
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoginError('');
    setLoginPendingInfo('');
    setLoginLoading(true);

    try {
      const response = await fetch('http://localhost:5001/api/auth/doctor/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword })
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.status === 'PENDING') {
          setLoginPendingInfo(data.message);
        } else {
          setLoginError(data.message || 'Login failed. Please verify credentials.');
        }
      } else {
        if (onDoctorLoginSuccess) {
          onDoctorLoginSuccess(data.doctor);
        }
      }
    } catch (err) {
      setLoginError('Unable to connect to server. Please verify backend is running.');
    } finally {
      setLoginLoading(false);
    }
  };

  // Handle Certificate File Select
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setCertificateError('');
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setCertificateError('File size exceeds 10MB limit.');
        return;
      }
      setCertificateFile(file);
    }
  };

  // Handle Registration Submit with FormData (for file upload)
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setRegisterError('');
    setRegisterLoading(true);

    try {
      const submissionData = new FormData();
      submissionData.append('name', formData.name);
      submissionData.append('email', formData.email);
      submissionData.append('password', formData.password);
      submissionData.append('phone', formData.phone);
      submissionData.append('specialization', formData.specialization);
      submissionData.append('licenseNumber', formData.licenseNumber);
      submissionData.append('yearsOfExperience', formData.yearsOfExperience);
      submissionData.append('qualification', formData.qualification);
      submissionData.append('hospitalAffiliation', formData.hospitalAffiliation);

      if (certificateFile) {
        submissionData.append('certificate', certificateFile);
      }

      const response = await fetch('http://localhost:5001/api/auth/doctor/register', {
        method: 'POST',
        body: submissionData
      });

      const data = await response.json();

      if (!response.ok) {
        setRegisterError(data.message || 'Registration failed. Please check the form.');
      } else {
        // Success! Transition to single success confirmation page
        setRegisteredDoctor(data.doctor);
        setCurrentView('success');
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

        {/* ----------------- VIEW 1: DOCTOR LOGIN PAGE ----------------- */}
        {currentView === 'login' && (
          <div className="auth-card">
            <div className="auth-header">
              <div className="auth-icon-badge">
                <Stethoscope size={28} />
              </div>
              <h2 className="auth-title">Doctor Portal Login</h2>
              <p className="auth-subtitle">
                Access your scheduled consultations, patient history, and prescription tools.
              </p>
            </div>

            {loginError && (
              <div className="auth-alert auth-alert-error">
                <AlertCircle size={18} style={{ flexShrink: 0 }} />
                <span>{loginError}</span>
              </div>
            )}

            {loginPendingInfo && (
              <div className="auth-alert auth-alert-pending">
                <Clock size={18} style={{ flexShrink: 0 }} />
                <span>{loginPendingInfo}</span>
              </div>
            )}

            <form onSubmit={handleLoginSubmit} className="auth-form">
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <div className="input-wrapper">
                  <Mail size={18} className="input-icon" />
                  <input
                    type="email"
                    required
                    placeholder="dr.rajesh@apollo.com"
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
                {loginLoading ? 'Authenticating...' : 'Sign In as Doctor'}
              </button>
            </form>

            {/* Below registration link */}
            <div className="auth-footer-link-group">
              <p className="auth-switch-text">
                Don’t have a registered doctor account?{' '}
                <button
                  type="button"
                  className="auth-link-btn"
                  onClick={() => {
                    setLoginError('');
                    setLoginPendingInfo('');
                    setCurrentView('register');
                  }}
                >
                  Register as Doctor
                </button>
              </p>
            </div>
          </div>
        )}

        {/* ----------------- VIEW 2: DOCTOR REGISTRATION FORM ----------------- */}
        {currentView === 'register' && (
          <div className="auth-card auth-card-wide">
            <div className="auth-header">
              <div className="auth-icon-badge">
                <FileCheck2 size={28} />
              </div>
              <h2 className="auth-title">Doctor Registration</h2>
              <p className="auth-subtitle">
                Provide your medical credentials. All registrations require hospital administration verification.
              </p>
            </div>

            {registerError && (
              <div className="auth-alert auth-alert-error">
                <AlertCircle size={18} style={{ flexShrink: 0 }} />
                <span>{registerError}</span>
              </div>
            )}

            <form onSubmit={handleRegisterSubmit} className="auth-form">
              <div className="form-grid-2">
                {/* Full Name */}
                <div className="form-group">
                  <label className="form-label">Full Name (with Dr. prefix) *</label>
                  <div className="input-wrapper">
                    <User size={18} className="input-icon" />
                    <input
                      type="text"
                      required
                      placeholder="Dr. Rajesh Sharma"
                      className="form-input"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                </div>

                {/* Email Address */}
                <div className="form-group">
                  <label className="form-label">Email Address *</label>
                  <div className="input-wrapper">
                    <Mail size={18} className="input-icon" />
                    <input
                      type="email"
                      required
                      placeholder="dr.rajesh.sharma@apollo.com"
                      className="form-input"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="form-group">
                  <label className="form-label">Password *</label>
                  <div className="input-wrapper">
                    <Lock size={18} className="input-icon" />
                    <input
                      type="password"
                      required
                      placeholder="Create a secure password"
                      className="form-input"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    />
                  </div>
                </div>

                {/* Contact Phone (India) */}
                <div className="form-group">
                  <label className="form-label">Contact Mobile Number *</label>
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

                {/* Medical License Number (India MCI / NMC) */}
                <div className="form-group">
                  <label className="form-label">NMC / State Medical Council Reg. Number *</label>
                  <div className="input-wrapper">
                    <Award size={18} className="input-icon" />
                    <input
                      type="text"
                      required
                      placeholder="MCI/NMC-2018-84920"
                      className="form-input"
                      value={formData.licenseNumber}
                      onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
                    />
                  </div>
                </div>

                {/* Specialization */}
                <div className="form-group">
                  <label className="form-label">Medical Specialization *</label>
                  <div className="input-wrapper">
                    <Briefcase size={18} className="input-icon" />
                    <select
                      className="form-input form-select"
                      value={formData.specialization}
                      onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                    >
                      <option value="General Medicine">General Medicine</option>
                      <option value="Cardiology">Cardiology</option>
                      <option value="Neurology">Neurology</option>
                      <option value="Pediatrics">Pediatrics</option>
                      <option value="Orthopedics">Orthopedics</option>
                      <option value="Dermatology">Dermatology</option>
                      <option value="Emergency Medicine">Emergency Medicine</option>
                      <option value="Gynecology & Obstetrics">Gynecology & Obstetrics</option>
                      <option value="ENT Specialist">ENT Specialist</option>
                    </select>
                  </div>
                </div>

                {/* Years of Experience */}
                <div className="form-group">
                  <label className="form-label">Years of Clinical Experience</label>
                  <div className="input-wrapper">
                    <Clock size={18} className="input-icon" />
                    <input
                      type="number"
                      min="0"
                      max="60"
                      placeholder="e.g. 8"
                      className="form-input"
                      value={formData.yearsOfExperience}
                      onChange={(e) => setFormData({ ...formData, yearsOfExperience: e.target.value })}
                    />
                  </div>
                </div>

                {/* Medical Qualification */}
                <div className="form-group">
                  <label className="form-label">Medical Qualifications</label>
                  <div className="input-wrapper">
                    <ShieldCheck size={18} className="input-icon" />
                    <input
                      type="text"
                      placeholder="MBBS, MD (General Medicine)"
                      className="form-input"
                      value={formData.qualification}
                      onChange={(e) => setFormData({ ...formData, qualification: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Hospital Affiliation (India) */}
              <div className="form-group">
                <label className="form-label">Hospital / Clinic Affiliation (India)</label>
                <div className="input-wrapper">
                  <Building2 size={18} className="input-icon" />
                  <input
                    type="text"
                    placeholder="AIIMS New Delhi / Apollo Hospitals, Chennai"
                    className="form-input"
                    value={formData.hospitalAffiliation}
                    onChange={(e) => setFormData({ ...formData, hospitalAffiliation: e.target.value })}
                  />
                </div>
              </div>

              {/* Specific Field: Upload Registration Certificate */}
              <div className="form-group">
                <label className="form-label">
                  Medical Registration Certificate Upload (NMC / State Council)
                </label>
                <div className="certificate-upload-box">
                  {!certificateFile ? (
                    <label className="certificate-dropzone">
                      <input 
                        type="file" 
                        accept=".pdf,.png,.jpg,.jpeg" 
                        onChange={handleFileChange} 
                        style={{ display: 'none' }}
                      />
                      <div className="upload-icon-circle">
                        <Upload size={22} color="#0284c7" />
                      </div>
                      <div className="upload-prompt-text">
                        <strong>Click to upload your medical certificate</strong>
                        <span>Supports PDF, JPG, PNG (Max 10MB)</span>
                      </div>
                    </label>
                  ) : (
                    <div className="certificate-selected-pill">
                      <div className="file-info-left">
                        <FileText size={22} color="#0284c7" />
                        <div>
                          <div className="file-name">{certificateFile.name}</div>
                          <div className="file-size">{(certificateFile.size / (1024 * 1024)).toFixed(2)} MB</div>
                        </div>
                      </div>
                      <button 
                        type="button" 
                        className="btn-remove-file" 
                        onClick={() => setCertificateFile(null)}
                        title="Remove file"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  )}
                  {certificateError && (
                    <div className="file-error-msg">{certificateError}</div>
                  )}
                </div>
              </div>

              <div className="verification-notice-pill">
                <ShieldCheck size={16} color="#0284c7" />
                <span>By submitting, your certificates and council registration details will be verified by the Hospital Administration.</span>
              </div>

              <button 
                type="submit" 
                className="btn-auth-submit"
                disabled={registerLoading}
              >
                {registerLoading ? 'Submitting Registration...' : 'Complete Doctor Registration'}
              </button>
            </form>

            <div className="auth-footer-link-group">
              <p className="auth-switch-text">
                Already registered as a doctor?{' '}
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

        {/* ----------------- VIEW 3: REGISTRATION SUCCESSFUL PAGE ----------------- */}
        {currentView === 'success' && (
          <div className="auth-card auth-card-success">
            <div className="success-icon-badge">
              <CheckCircle2 size={56} color="#10b981" />
            </div>

            <h2 className="success-title">Registration Successful!</h2>

            <p className="success-lead-text">
              Admin will review & approve your profile and notify you sooner.
            </p>

            <div className="success-info-box">
              {/* Changed from 'Application Submitted to Database' to 'Application Submitted' as requested */}
              <div className="success-info-header">
                <ShieldCheck size={18} color="#0284c7" />
                <span>Application Submitted</span>
              </div>
              <div className="success-details-list">
                <div className="success-detail-row">
                  <span className="detail-label">Doctor Name:</span>
                  <span className="detail-val">{registeredDoctor?.name}</span>
                </div>
                <div className="success-detail-row">
                  <span className="detail-label">Registered Email:</span>
                  <span className="detail-val">{registeredDoctor?.email}</span>
                </div>
                <div className="success-detail-row">
                  <span className="detail-label">Council Reg. Number:</span>
                  <span className="detail-val">{registeredDoctor?.licenseNumber}</span>
                </div>
                <div className="success-detail-row">
                  <span className="detail-label">Specialization:</span>
                  <span className="detail-val">{registeredDoctor?.specialization}</span>
                </div>
                {registeredDoctor?.certificateName && (
                  <div className="success-detail-row">
                    <span className="detail-label">Certificate Attached:</span>
                    <span className="detail-val" style={{ color: '#0284c7', fontWeight: 600 }}>
                      {registeredDoctor?.certificateName}
                    </span>
                  </div>
                )}
                <div className="success-detail-row">
                  <span className="detail-label">Current Status:</span>
                  <span className="status-badge-pending">
                    <Clock size={14} /> Pending Admin Approval
                  </span>
                </div>
              </div>
            </div>

            <div className="success-action-buttons">
              <button
                type="button"
                className="btn-success-primary"
                onClick={() => setCurrentView('login')}
              >
                Go to Doctor Login
              </button>
              <button
                type="button"
                className="btn-success-secondary"
                onClick={onBackToHome}
              >
                Return to Home
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
