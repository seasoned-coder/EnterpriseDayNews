import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import StudentUpload from './components/StudentUpload';
import StaffDashboard from './components/StaffDashboard';
import ProjectorDisplay from './components/ProjectorDisplay';

function App() {
  return (
    <Router>
      <div className="App">
        <nav>
          <ul>
            <li><Link to="/student">Student Upload</Link></li>
            <li><Link to="/staff">Staff Dashboard</Link></li>
            <li><Link to="/projector">Projector</Link></li>
          </ul>
        </nav>

        <Routes>
          <Route path="/student" element={<StudentUpload />} />
          <Route path="/staff/*" element={<StaffDashboard />} />
          <Route path="/projector" element={<ProjectorDisplay />} />
          <Route path="/" element={<h1>Welcome to Enterprise Day News</h1>} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
