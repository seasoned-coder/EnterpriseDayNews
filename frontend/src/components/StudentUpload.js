import React, { useState } from 'react';
import axios from 'axios';

function StudentUpload() {
  const [file, setFile] = useState(null);
  const [username, setUsername] = useState('student1'); // Mock login
  const [message, setMessage] = useState('');

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      await axios.post('/api/student/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'X-User': username,
          'X-Role': 'STUDENT'
        }
      });
      setMessage('Upload successful!');
    } catch (error) {
      setMessage('Upload failed.');
    }
  };

  return (
    <div>
      <h2>Student Upload</h2>
      <input type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="Username" />
      <form onSubmit={handleUpload}>
        <input type="file" onChange={e => setFile(e.target.files[0])} />
        <button type="submit">Upload</button>
      </form>
      {message && <p>{message}</p>}
    </div>
  );
}

export default StudentUpload;
