import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { ENDPOINTS, ROLES, authHeaders } from '../api';
import useMockAuth from '../hooks/useMockAuth';

const VIEWS = { NEW: 'new', APPROVED: 'approved', REJECTED: 'rejected' };

function StaffDashboard() {
  const [images, setImages] = useState([]);
  const [view, setView] = useState(VIEWS.NEW);
  const [error, setError] = useState('');
  const { username } = useMockAuth('staff1');

  const headers = useMemo(() => authHeaders(username, ROLES.STAFF), [username]);

  const fetchImages = useCallback(async () => {
    try {
      const res = await axios.get(ENDPOINTS.staffByView(view), { headers });
      setImages(res.data);
      setError('');
    } catch (e) {
      setError('Failed to load images.');
    }
  }, [view, headers]);

  useEffect(() => {
    fetchImages();
  }, [fetchImages]);

  const handleAction = async (id, action) => {
    const url =
      action === 'approve' ? ENDPOINTS.staffApprove(id) : ENDPOINTS.staffReject(id);
    try {
      await axios.post(url, {}, { headers });
      await fetchImages();
    } catch (e) {
      setError(`Failed to ${action} image.`);
    }
  };

  const handleToggleDisplay = async (id, display) => {
    try {
      await axios.post(ENDPOINTS.staffToggleDisplay(id, display), {}, { headers });
      await fetchImages();
    } catch (e) {
      setError('Failed to toggle display.');
    }
  };

  return (
    <div>
      <h2>Staff Dashboard</h2>
      <div>
        <button onClick={() => setView(VIEWS.NEW)}>New</button>
        <button onClick={() => setView(VIEWS.APPROVED)}>Approved</button>
        <button onClick={() => setView(VIEWS.REJECTED)}>Rejected</button>
      </div>
      {error && <p role="alert" style={{ color: 'red' }}>{error}</p>}
      <table>
        <thead>
          <tr>
            <th>Image</th>
            <th>Uploaded By</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {images.map((img) => (
            <tr key={img.id}>
              <td>
                <img
                  src={img.filePath}
                  alt={img.originalFileName}
                  width="100"
                  loading="lazy"
                />
              </td>
              <td>{img.uploadedBy}</td>
              <td>
                {view === VIEWS.NEW && (
                  <>
                    <button onClick={() => handleAction(img.id, 'approve')}>Approve</button>
                    <button onClick={() => handleAction(img.id, 'reject')}>Reject</button>
                  </>
                )}
                {view === VIEWS.APPROVED && (
                  <button onClick={() => handleToggleDisplay(img.id, !img.display)}>
                    {img.display ? 'Hide' : 'Display'}
                  </button>
                )}
                {view === VIEWS.REJECTED && <span>Rejected</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default StaffDashboard;
