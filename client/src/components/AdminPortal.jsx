import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  Lock, 
  Mail, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  FileText, 
  UserCheck, 
  ExternalLink,
  LogOut,
  Hospital,
  ArrowLeft,
  Trash2
} from 'lucide-react';

export default function AdminPortal({ onBackToHome }) {
  const [adminToken, setAdminToken] = useState(null);
  const [adminUser, setAdminUser] = useState(null);

  // Login form state
  const [email, setEmail] = useState('admin@medilink.in');
  const [password, setPassword] = useState('Admin@123');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Dashboard state
  const [pendingDoctors, setPendingDoctors] = useState([]);
  const [activeDoctors, setActiveDoctors] = useState([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState('');
  const [approvingId, setApprovingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  // Fetch doctors list for admin
  const fetchDoctors = async () => {
    setDataLoading(true);
    try {
      const res = await fetch('http://localhost:5001/api/admin/doctors');
      const data = await res.json();
      if (data.success) {
        setPendingDoctors(data.pendingDoctors || []);
        setActiveDoctors(data.activeDoctors || []);
      }
    } catch (err) {
      console.error('Failed to load doctors list', err);
    } finally {
      setDataLoading(false);
    }
  };

  useEffect(() => {
    if (adminToken) {
      fetchDoctors();
    }
  }, [adminToken]);

  // Handle Admin Login
  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);

    try {
      const res = await fetch('http://localhost:5001/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();

      if (!res.ok) {
        setLoginError(data.message || 'Authentication failed. Please verify credentials.');
      } else {
        setAdminUser(data.admin);
        setAdminToken(true);
      }
    } catch (err) {
      setLoginError('Unable to connect to administration server.');
    } finally {
      setLoginLoading(false);
    }
  };

  // Handle Approve Doctor
  const handleApprove = async (doctorId, doctorName) => {
    setApprovingId(doctorId);
    setActionSuccessMsg('');

    try {
      const res = await fetch(`http://localhost:5001/api/admin/doctors/${doctorId}/approve`, {
        method: 'PATCH'
      });
      const data = await res.json();

      if (res.ok) {
        setActionSuccessMsg(`Dr. ${doctorName} has been approved successfully!`);
        await fetchDoctors();
      } else {
        alert(data.message || 'Failed to approve doctor.');
      }
    } catch (err) {
      alert('Error communicating with server.');
    } finally {
      setApprovingId(null);
    }
  };

  // Handle Delete Doctor
  const handleDelete = async (doctorId, doctorName) => {
    const confirmed = window.confirm(`Are you sure you want to permanently delete Dr. ${doctorName} from the database?`);
    if (!confirmed) return;

    setDeletingId(doctorId);
    setActionSuccessMsg('');

    try {
      const res = await fetch(`http://localhost:5001/api/admin/doctors/${doctorId}`, {
        method: 'DELETE'
      });
      const data = await res.json();

      if (res.ok) {
        setActionSuccessMsg(`Dr. ${doctorName} has been permanently deleted from the system.`);
        await fetchDoctors();
      } else {
        alert(data.message || 'Failed to delete doctor.');
      }
    } catch (err) {
      alert('Error communicating with server.');
    } finally {
      setDeletingId(null);
    }
  };

  // Handle Admin Logout
  const handleLogout = () => {
    setAdminToken(null);
    setAdminUser(null);
    setActionSuccessMsg('');
  };

  // ------------------- VIEW 1: ADMIN LOGIN SCREEN (NO NAVBAR) -------------------
  if (!adminToken) {
    return (
      <div className="auth-page-wrapper">
        <div className="auth-container">
          {/* Back to Home Button */}
          <button 
            type="button" 
            className="auth-back-btn" 
            onClick={onBackToHome}
          >
            <ArrowLeft size={16} />
            Back to MediLink Home
          </button>

          <div className="auth-card">
            <div className="auth-header">
              <div className="auth-icon-badge" style={{ background: '#fef2f2', color: '#dc2626' }}>
                <ShieldAlert size={28} />
              </div>
              <h2 className="auth-title">Hospital Administration</h2>
              <p className="auth-subtitle">
                Restricted portal for credential verification, doctor approvals, and hospital governance.
              </p>
            </div>

            {loginError && (
              <div className="auth-alert auth-alert-error">
                <AlertCircle size={18} style={{ flexShrink: 0 }} />
                <span>{loginError}</span>
              </div>
            )}

            <form onSubmit={handleAdminLogin} className="auth-form">
              <div className="form-group">
                <label className="form-label">Administrator Email</label>
                <div className="input-wrapper">
                  <Mail size={18} className="input-icon" />
                  <input
                    type="email"
                    required
                    placeholder="admin@medilink.in"
                    className="form-input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Admin Security Password</label>
                <div className="input-wrapper">
                  <Lock size={18} className="input-icon" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    className="form-input"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>

              <div style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '10px 14px',
                fontSize: '0.82rem',
                color: '#64748b'
              }}>
                <strong>Admin Credential Hint:</strong> admin@medilink.in / Admin@123
              </div>

              <button 
                type="submit" 
                className="btn-auth-submit"
                disabled={loginLoading}
                style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)' }}
              >
                {loginLoading ? 'Verifying...' : 'Access Administration Console'}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // ------------------- VIEW 2: ADMIN APPROVAL & DELETION DASHBOARD (NO NAVBAR) -------------------
  return (
    <div className="admin-dashboard-wrapper">
      <div className="container">
        
        {/* Back to Home Quick Link */}
        <div style={{ marginBottom: '16px' }}>
          <button 
            type="button" 
            className="auth-back-btn" 
            onClick={onBackToHome}
          >
            <ArrowLeft size={16} />
            Back to MediLink Home
          </button>
        </div>

        {/* Admin Navigation Bar */}
        <div className="admin-header-bar">
          <div className="admin-brand">
            <div className="admin-badge-icon">
              <Hospital size={24} />
            </div>
            <div>
              <h1 className="admin-panel-title">Hospital Administration Console</h1>
              <p className="admin-panel-sub">Doctor Verification, Active Roster & Account Lifecycle</p>
            </div>
          </div>

          <div className="admin-user-info">
            <span className="admin-badge-role">Admin: {adminUser?.name}</span>
            <button 
              type="button" 
              className="btn-admin-logout"
              onClick={handleLogout}
            >
              <LogOut size={16} />
              Admin Logout
            </button>
          </div>
        </div>

        {/* Global Action Banner */}
        {actionSuccessMsg && (
          <div className="admin-success-banner">
            <CheckCircle2 size={20} color="#059669" />
            <span>{actionSuccessMsg}</span>
          </div>
        )}

        {/* Analytics Counter Cards */}
        <div className="admin-stats-grid">
          <div className="admin-stat-card">
            <div className="admin-stat-num" style={{ color: '#d97706' }}>
              {pendingDoctors.length}
            </div>
            <div className="admin-stat-label">Pending for Approval</div>
          </div>
          <div className="admin-stat-card">
            <div className="admin-stat-num" style={{ color: '#059669' }}>
              {activeDoctors.length}
            </div>
            <div className="admin-stat-label">Active / Approved Doctors</div>
          </div>
        </div>

        {/* ---------------- SECTION 1: PENDING DOCTORS ---------------- */}
        <div className="admin-section-box">
          <div className="section-title-strip">
            <Clock size={20} color="#d97706" />
            <h2 className="admin-subheading">
              Doctors Pending Verification ({pendingDoctors.length})
            </h2>
          </div>

          {pendingDoctors.length === 0 ? (
            <div className="admin-empty-state">
              <CheckCircle2 size={36} color="#10b981" />
              <p>All doctor applications have been processed. No pending approvals remaining.</p>
            </div>
          ) : (
            <div className="doctors-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Doctor Name</th>
                    <th>Contact & Email</th>
                    <th>Specialization & Reg. No</th>
                    <th>Qualifications</th>
                    <th>Registration Certificate</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingDoctors.map((doc) => {
                    const cert = doc.doctorProfile?.certificates?.[0];
                    return (
                      <tr key={doc._id}>
                        <td>
                          <strong>{doc.name}</strong>
                          <span className="table-sub-detail">
                            Exp: {doc.doctorProfile?.yearsOfExperience || 0} years
                          </span>
                        </td>
                        <td>
                          <div>{doc.email}</div>
                          <div className="table-sub-detail">{doc.phone}</div>
                        </td>
                        <td>
                          <span className="spec-badge">
                            {doc.doctorProfile?.specialization}
                          </span>
                          <div className="table-sub-detail">
                            Reg: {doc.doctorProfile?.licenseNumber}
                          </div>
                        </td>
                        <td>
                          <div>{doc.doctorProfile?.qualification || 'MBBS'}</div>
                          <div className="table-sub-detail">
                            {doc.doctorProfile?.hospitalAffiliation || 'Independent Practice'}
                          </div>
                        </td>
                        <td>
                          {cert ? (
                            <a 
                              href={`http://localhost:5001${cert.fileUrl}`} 
                              target="_blank" 
                              rel="noreferrer"
                              className="cert-view-link"
                              title="Inspect uploaded registration certificate"
                            >
                              <FileText size={15} />
                              <span>{cert.documentName}</span>
                              <ExternalLink size={12} />
                            </a>
                          ) : (
                            <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>No file uploaded</span>
                          )}
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <button
                              type="button"
                              className="btn-approve-doctor"
                              disabled={approvingId === doc._id || deletingId === doc._id}
                              onClick={() => handleApprove(doc._id, doc.name)}
                            >
                              <UserCheck size={15} />
                              {approvingId === doc._id ? 'Approving...' : 'Approve'}
                            </button>
                            <button
                              type="button"
                              className="btn-delete-doctor"
                              disabled={deletingId === doc._id || approvingId === doc._id}
                              onClick={() => handleDelete(doc._id, doc.name)}
                              title="Delete doctor registration"
                            >
                              <Trash2 size={15} />
                              {deletingId === doc._id ? 'Deleting...' : 'Delete'}
                            </button>
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

        {/* ---------------- SECTION 2: ACTIVE DOCTORS ---------------- */}
        <div className="admin-section-box" style={{ marginTop: '36px' }}>
          <div className="section-title-strip">
            <CheckCircle2 size={20} color="#059669" />
            <h2 className="admin-subheading">
              Active Doctors ({activeDoctors.length})
            </h2>
          </div>

          {activeDoctors.length === 0 ? (
            <div className="admin-empty-state">
              <p>No active doctors yet. Approved doctors will appear here.</p>
            </div>
          ) : (
            <div className="doctors-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Doctor Name</th>
                    <th>Email Address</th>
                    <th>Specialization</th>
                    <th>License / Reg No</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {activeDoctors.map((doc) => (
                    <tr key={doc._id}>
                      <td>
                        <strong>{doc.name}</strong>
                      </td>
                      <td>{doc.email}</td>
                      <td>
                        <span className="spec-badge">
                          {doc.doctorProfile?.specialization}
                        </span>
                      </td>
                      <td>{doc.doctorProfile?.licenseNumber}</td>
                      <td>
                        <span className="badge-active-status">
                          <CheckCircle2 size={13} /> Active & Approved
                        </span>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn-delete-doctor"
                          disabled={deletingId === doc._id}
                          onClick={() => handleDelete(doc._id, doc.name)}
                          title="Delete doctor account"
                        >
                          <Trash2 size={15} />
                          {deletingId === doc._id ? 'Deleting...' : 'Delete'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
