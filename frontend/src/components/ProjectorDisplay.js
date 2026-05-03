import React, { useState, useEffect } from 'react';
import axios from 'axios';

function ProjectorDisplay() {
  const [images, setImages] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [settings, setSettings] = useState({ intervalSpeedSeconds: 5, displayDurationSeconds: 10 });

  useEffect(() => {
    const fetchImages = async () => {
      const res = await axios.get('/api/projector/images');
      setImages(res.data);
    };
    const fetchSettings = async () => {
      const res = await axios.get('/api/projector/settings');
      setSettings(res.data);
    };

    fetchImages();
    fetchSettings();

    const imageInterval = setInterval(fetchImages, 60000); // Refresh list every minute
    return () => clearInterval(imageInterval);
  }, []);

  useEffect(() => {
    if (images.length === 0) return;

    const rotationInterval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length);
    }, settings.intervalSpeedSeconds * 1000);

    return () => clearInterval(rotationInterval);
  }, [images, settings]);

  if (images.length === 0) return <div>No approved images to display</div>;

  const currentImage = images[currentIndex];

  return (
    <div style={{ textAlign: 'center', backgroundColor: 'black', color: 'white', height: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      <img src={currentImage.filePath} alt={currentImage.originalFileName} style={{ maxHeight: '80vh', maxWidth: '100%' }} />
      <p>{currentImage.uploadedBy}</p>
    </div>
  );
}

export default ProjectorDisplay;
