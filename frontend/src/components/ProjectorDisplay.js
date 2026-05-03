import React, { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { ENDPOINTS } from '../api';

const DEFAULT_SETTINGS = {
  intervalSpeedSeconds: 5,
  displayDurationSeconds: 10,
  imageRefreshSeconds: 60,
};

const containerStyle = {
  textAlign: 'center',
  backgroundColor: 'black',
  color: 'white',
  height: '100vh',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
};

const imageStyle = { maxHeight: '80vh', maxWidth: '100%' };

function ProjectorDisplay() {
  const [images, setImages] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [error, setError] = useState('');

  const fetchImages = useCallback(async () => {
    try {
      const res = await axios.get(ENDPOINTS.projectorImages);
      setImages(res.data);
      // Defensive reset: if list shrinks below the current index, snap back to 0.
      setCurrentIndex((i) => (i >= res.data.length ? 0 : i));
      setError('');
    } catch (e) {
      setError('Failed to load images.');
    }
  }, []);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await axios.get(ENDPOINTS.projectorSettings);
      setSettings({ ...DEFAULT_SETTINGS, ...res.data });
    } catch (e) {
      // Keep defaults; surface a soft warning only.
      setError('Failed to load settings, using defaults.');
    }
  }, []);

  // Fetch images + settings on mount, then poll the image list at a configurable interval.
  useEffect(() => {
    fetchImages();
    fetchSettings();
  }, [fetchImages, fetchSettings]);

  useEffect(() => {
    const refreshMs = Math.max(settings.imageRefreshSeconds, 5) * 1000;
    const id = setInterval(fetchImages, refreshMs);
    return () => clearInterval(id);
  }, [fetchImages, settings.imageRefreshSeconds]);

  // Rotation depends only on the primitive interval value, not the whole settings object.
  useEffect(() => {
    if (images.length === 0) return undefined;
    const intervalMs = Math.max(settings.intervalSpeedSeconds, 1) * 1000;
    const id = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length);
    }, intervalMs);
    return () => clearInterval(id);
  }, [images, settings.intervalSpeedSeconds]);

  if (images.length === 0) {
    return (
      <div style={containerStyle}>
        <p>No approved images to display</p>
        {error && <p role="alert">{error}</p>}
      </div>
    );
  }

  const safeIndex = currentIndex < images.length ? currentIndex : 0;
  const currentImage = images[safeIndex];

  return (
    <div style={containerStyle}>
      <img src={currentImage.filePath} alt={currentImage.originalFileName} style={imageStyle} />
      <p>{currentImage.uploadedBy}</p>
    </div>
  );
}

export default ProjectorDisplay;
