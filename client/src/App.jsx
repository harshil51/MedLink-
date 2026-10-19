import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import Features from './components/Features';
import EmergencyPanel from './components/EmergencyPanel';
import Footer from './components/Footer';
import DoctorAuth from './components/DoctorAuth';
import AdminPortal from './components/AdminPortal';
import DoctorDashboard from './components/DoctorDashboard';
import PatientAuth from './components/PatientAuth';
import PatientDashboard from './components/PatientDashboard';

export default function App() {
  // Stored doctor session
  const [loggedInDoctor, setLoggedInDoctor] = useState(() => {
    try {
      const saved = localStorage.getItem('medilink_doctor');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Stored patient session
  const [loggedInPatient, setLoggedInPatient] = useState(() => {
    try {
      const saved = localStorage.getItem('medilink_patient');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // 'home' | 'doctor_auth' | 'admin' | 'doctor_dashboard' | 'patient_auth' | 'patient_dashboard'
  const [currentView, setCurrentView] = useState(() => {
    const path = window.location.pathname.toLowerCase();
    const hash = window.location.hash.toLowerCase();
    if (path.includes('/admin') || hash.includes('#admin')) {
      return 'admin';
    }
    const savedDoctor = localStorage.getItem('medilink_doctor');
    if (savedDoctor) {
      return 'doctor_dashboard';
    }
    const savedPatient = localStorage.getItem('medilink_patient');
    if (savedPatient) {
      return 'patient_dashboard';
    }
    return 'home';
  });

  // Listen for browser navigation changes to /admin
  useEffect(() => {
    const handleLocationChange = () => {
      const path = window.location.pathname.toLowerCase();
      const hash = window.location.hash.toLowerCase();
      if (path.includes('/admin') || hash.includes('#admin')) {
        setCurrentView('admin');
      }
    };

    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener('hashchange', handleLocationChange);
    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('hashchange', handleLocationChange);
    };
  }, []);

  const navigateTo = (view) => {
    setCurrentView(view);
    if (view === 'home') {
      window.history.pushState({}, '', '/');
    } else if (view === 'admin') {
      window.history.pushState({}, '', '/admin');
    }
  };

  // Doctor Handlers
  const handleDoctorLoginSuccess = (doctor) => {
    try {
      localStorage.setItem('medilink_doctor', JSON.stringify(doctor));
    } catch (e) {
      console.error(e);
    }
    setLoggedInDoctor(doctor);
    setCurrentView('doctor_dashboard');
  };

  const handleDoctorLogout = () => {
    try {
      localStorage.removeItem('medilink_doctor');
    } catch (e) {
      console.error(e);
    }
    setLoggedInDoctor(null);
    navigateTo('home');
  };

  // Patient Handlers
  const handlePatientLoginSuccess = (patient) => {
    try {
      localStorage.setItem('medilink_patient', JSON.stringify(patient));
    } catch (e) {
      console.error(e);
    }
    setLoggedInPatient(patient);
    setCurrentView('patient_dashboard');
  };

  const handlePatientLogout = () => {
    try {
      localStorage.removeItem('medilink_patient');
    } catch (e) {
      console.error(e);
    }
    setLoggedInPatient(null);
    navigateTo('home');
  };

  return (
    <div className="app-layout">
      {/* Dynamic Ambient Background Aura Orbs */}
      <div className="ambient-orb ambient-orb-1" aria-hidden="true" />
      <div className="ambient-orb ambient-orb-2" aria-hidden="true" />
      <div className="ambient-orb ambient-orb-3" aria-hidden="true" />

      {/* Top Navbar: STRICTLY ONLY ON THE HOME PAGE */}
      {currentView === 'home' && (
        <Navbar 
          onDoctorClick={() => {
            if (loggedInDoctor) {
              setCurrentView('doctor_dashboard');
            } else {
              navigateTo('doctor_auth');
            }
          }}
          onPatientClick={() => {
            if (loggedInPatient) {
              setCurrentView('patient_dashboard');
            } else {
              navigateTo('patient_auth');
            }
          }}
          onHomeClick={() => navigateTo('home')}
          activeView={currentView}
        />
      )}

      {/* Main Content Area with Smooth View Transition */}
      <main className="main-content-area" key={currentView}>
        {currentView === 'home' && (
          <div className="view-fade-slide">
            <Hero 
              onPatientClick={() => {
                if (loggedInPatient) {
                  setCurrentView('patient_dashboard');
                } else {
                  navigateTo('patient_auth');
                }
              }}
              onDoctorClick={() => {
                if (loggedInDoctor) {
                  setCurrentView('doctor_dashboard');
                } else {
                  navigateTo('doctor_auth');
                }
              }}
            />
            <Features />
          </div>
        )}

        {currentView === 'doctor_auth' && (
          <div className="view-fade-slide">
            <DoctorAuth 
              onBackToHome={() => navigateTo('home')} 
              onDoctorLoginSuccess={handleDoctorLoginSuccess}
            />
          </div>
        )}

        {currentView === 'patient_auth' && (
          <div className="view-fade-slide">
            <PatientAuth 
              onBackToHome={() => navigateTo('home')} 
              onPatientLoginSuccess={handlePatientLoginSuccess}
            />
          </div>
        )}

        {currentView === 'admin' && (
          <div className="view-fade-slide">
            <AdminPortal 
              onBackToHome={() => navigateTo('home')} 
            />
          </div>
        )}

        {currentView === 'doctor_dashboard' && (
          <div className="view-fade-slide">
            <DoctorDashboard 
              doctor={loggedInDoctor} 
              onLogout={handleDoctorLogout} 
            />
          </div>
        )}

        {currentView === 'patient_dashboard' && (
          <div className="view-fade-slide">
            <PatientDashboard 
              patient={loggedInPatient} 
              onLogout={handlePatientLogout} 
            />
          </div>
        )}
      </main>

      {/* Emergency Contact & Footer: STRICTLY ONLY ON THE HOME PAGE */}
      {currentView === 'home' && (
        <div className="home-footer-group">
          <EmergencyPanel />
          <Footer />
        </div>
      )}
    </div>
  );
}
