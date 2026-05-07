import React, { useEffect, useState } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom'
import App from './App.jsx'
import Landing from './Landing.jsx'
import Login from './Login.jsx'
import Signup from './Signup.jsx'
import ForgotPassword from './ForgotPassword.jsx'
import './styles/index.css'

const PageAnnouncer = () => {
  const location = useLocation();
  const [announcement, setAnnouncement] = useState('');

  useEffect(() => {
    // Announce route changes to screen readers after a brief delay for the page to render
    const timeout = setTimeout(() => {
      setAnnouncement(`Navigated to ${document.title}`);
    }, 500);
    return () => clearTimeout(timeout);
  }, [location]);

  return (
    <div aria-live="assertive" className="sr-only" style={{ position: 'absolute', width: '1px', height: '1px', overflow: 'hidden', clip: 'rect(0, 0, 0, 0)' }}>
      {announcement}
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Router>
      <PageAnnouncer />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/forgotpassword" element={<ForgotPassword />} />
        <Route path="/chat" element={<App />} />
      </Routes>
    </Router>
  </React.StrictMode>,
)
