import React, { useState, useEffect } from 'react';
import axios from 'axios';

function StaffDashboard() {
  const [images, setImages] = useState([]);
  const [view, setView] = useState('new'); // new, approved, rejected
  const [username] = useState('staff1'); // Mock login

  const headers = {
    'X-User': username,
    'X-Role': 'STAFF'
  };

  const fetchImages = async () => {
    const res = await axios.get(`/api/staff/${view}`, { headers });
    setImages(res.data);
  };

  useEffect(() => {
    fetchImages();
  }, [view]);

  const handleAction = async (id, action) => {
    await axios.post(`/api/staff/${action}/${id}`, {}, { headers });
    fetchImages();
  };

  const handleToggleDisplay = async (id, display) => {
    await axios.post(`/api/staff/toggle-display/${id}?display=${display}`, {}, { headers });
    fetchImages();
  };

  const handleOrderChange = async (ids) => {
    await axios.post(`/api/staff/order`, ids, { headers });
    fetchImages();
  };

  return (
    <div>
      <h2>Staff Dashboard</h2>
      <div>
        <button onClick={() => setView('new')}>New</button>
        <button onClick={() => setView('approved')}>Approved</button>
        <button onClick={() => setView('rejected')}>Rejected</button>
      </div>
      <table>
        <thead>
          <tr>
            <th>Image</th>
            <th>Uploaded By</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {images.map(img => (
            <tr key={img.id}>
              <td><img src={img.filePath} alt={img.originalFileName} width="100" /></td>
              <td>{img.uploadedBy}</td>
              <td>
                {view === 'new' && (
                  <>
                    <button onClick={() => handleAction(img.id, 'approve')}>Approve</button>
                    <button onClick={() => handleAction(img.id, 'reject')}>Reject</button>
                  </>
                )}
                {view === 'approved' && (
                  <>
                    <button onClick={() => handleToggleDisplay(img.id, !img.display)}>
                      {img.display ? 'Hide' : 'Display'}
                    </button>
                  </>
                )}
                {view === 'rejected' && <span>Rejected</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default StaffDashboard;
