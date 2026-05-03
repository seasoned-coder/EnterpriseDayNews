import React from 'react';
import { render, screen, act } from '@testing-library/react';
import axios from 'axios';
import ProjectorDisplay from './ProjectorDisplay';

jest.mock('axios');

describe('ProjectorDisplay', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('shows empty state when no images', async () => {
    axios.get.mockImplementation((url) => {
      if (url === '/api/projector/images') return Promise.resolve({ data: [] });
      if (url === '/api/projector/settings')
        return Promise.resolve({ data: { intervalSpeedSeconds: 5, displayDurationSeconds: 10 } });
      return Promise.resolve({ data: [] });
    });

    await act(async () => {
      render(<ProjectorDisplay />);
    });

    expect(await screen.findByText(/No approved images to display/i)).toBeInTheDocument();
  });

  test('renders the first image and rotates after the configured interval', async () => {
    const images = [
      { id: 1, filePath: '/uploads/one.png', originalFileName: 'one.png', uploadedBy: 'alice' },
      { id: 2, filePath: '/uploads/two.png', originalFileName: 'two.png', uploadedBy: 'bob' },
    ];
    axios.get.mockImplementation((url) => {
      if (url === '/api/projector/images') return Promise.resolve({ data: images });
      if (url === '/api/projector/settings')
        return Promise.resolve({ data: { intervalSpeedSeconds: 5, displayDurationSeconds: 10 } });
      return Promise.resolve({ data: [] });
    });

    await act(async () => {
      render(<ProjectorDisplay />);
    });

    expect(await screen.findByText('alice')).toBeInTheDocument();
    expect(screen.getByRole('img')).toHaveAttribute('src', '/uploads/one.png');

    // Advance past the rotation interval
    await act(async () => {
      jest.advanceTimersByTime(5000);
    });

    expect(await screen.findByText('bob')).toBeInTheDocument();
    expect(screen.getByRole('img')).toHaveAttribute('src', '/uploads/two.png');
  });

  test('fetches both images and settings on mount', async () => {
    axios.get.mockImplementation((url) => {
      if (url === '/api/projector/images') return Promise.resolve({ data: [] });
      if (url === '/api/projector/settings')
        return Promise.resolve({ data: { intervalSpeedSeconds: 5, displayDurationSeconds: 10 } });
      return Promise.resolve({ data: [] });
    });

    await act(async () => {
      render(<ProjectorDisplay />);
    });

    expect(axios.get).toHaveBeenCalledWith('/api/projector/images');
    expect(axios.get).toHaveBeenCalledWith('/api/projector/settings');
  });
});
