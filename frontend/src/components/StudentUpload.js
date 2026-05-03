import React, { useState } from 'react';
import axios from 'axios';
import { ENDPOINTS, ROLES, authHeaders } from '../api';
import useMockAuth from '../hooks/useMockAuth';

function StudentUpload() {
  const [file, setFile] = useState(null);
  const { username, setUsername } = useMockAuth('student1');
  const [message, setMessage] = useState('');

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      await axios.post(ENDPOINTS.studentUpload, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          ...authHeaders(username, ROLES.STUDENT),
        },
      });
      setMessage('Upload successful!');
    } catch (error) {
      const detail = error?.response?.status
        ? ` (status ${error.response.status})`
        : '';
      setMessage(`Upload failed.${detail}`);
    }
  };

  return (
    <div>
      <h2>Student Upload</h2>
      <input
        type="text"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        placeholder="Username"
      />
      <form onSubmit={handleUpload}>
        <input type="file" onChange={(e) => setFile(e.target.files[0])} />
        <button type="submit">Upload</button>
      </form>
      {message && <p>{message}</p>}
    </div>
  );
}

export default StudentUpload;
