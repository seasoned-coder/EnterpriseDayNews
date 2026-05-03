import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import axios from 'axios';
import StaffDashboard from './StaffDashboard';

jest.mock('axios');

const newImages = [
  { id: 1, filePath: '/uploads/a.png', originalFileName: 'a.png', uploadedBy: 'student1', display: false },
];
const approvedImages = [
  { id: 2, filePath: '/uploads/b.png', originalFileName: 'b.png', uploadedBy: 'student2', display: true },
];
const rejectedImages = [
  { id: 3, filePath: '/uploads/c.png', originalFileName: 'c.png', uploadedBy: 'student3', display: false },
];

function mockGetByView() {
  axios.get.mockImplementation((url) => {
    if (url.endsWith('/new')) return Promise.resolve({ data: newImages });
    if (url.endsWith('/approved')) return Promise.resolve({ data: approvedImages });
    if (url.endsWith('/rejected')) return Promise.resolve({ data: rejectedImages });
    return Promise.resolve({ data: [] });
  });
}

describe('StaffDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetByView();
    axios.post.mockResolvedValue({ data: {} });
  });

  test('renders new images by default with approve/reject buttons', async () => {
    render(<StaffDashboard />);
    expect(await screen.findByText('student1')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Approve/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Reject/i })).toBeInTheDocument();
    expect(axios.get).toHaveBeenCalledWith('/api/staff/new', expect.any(Object));
  });

  test('switches to approved view and shows Hide button (display=true)', async () => {
    render(<StaffDashboard />);
    await screen.findByText('student1');
    fireEvent.click(screen.getByRole('button', { name: 'Approved' }));
    expect(await screen.findByText('student2')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Hide/i })).toBeInTheDocument();
  });

  test('switches to rejected view and shows Rejected label', async () => {
    render(<StaffDashboard />);
    await screen.findByText('student1');
    fireEvent.click(screen.getByRole('button', { name: 'Rejected' }));
    expect(await screen.findByText('student3')).toBeInTheDocument();
    expect(screen.getByText('Rejected')).toBeInTheDocument();
  });

  test('approve action posts to backend and refreshes', async () => {
    render(<StaffDashboard />);
    await screen.findByText('student1');
    fireEvent.click(screen.getByRole('button', { name: /Approve/i }));
    await waitFor(() =>
      expect(axios.post).toHaveBeenCalledWith('/api/staff/approve/1', {}, expect.any(Object))
    );
  });

  test('reject action posts to backend', async () => {
    render(<StaffDashboard />);
    await screen.findByText('student1');
    fireEvent.click(screen.getByRole('button', { name: /Reject/i }));
    await waitFor(() =>
      expect(axios.post).toHaveBeenCalledWith('/api/staff/reject/1', {}, expect.any(Object))
    );
  });

  test('toggle display posts with negated display flag', async () => {
    render(<StaffDashboard />);
    await screen.findByText('student1');
    fireEvent.click(screen.getByRole('button', { name: 'Approved' }));
    await screen.findByText('student2');
    fireEvent.click(screen.getByRole('button', { name: /Hide/i }));
    await waitFor(() =>
      // image had display=true, so toggled to false
      expect(axios.post).toHaveBeenCalledWith(
        '/api/staff/toggle-display/2?display=false',
        {},
        expect.any(Object)
      )
    );
  });
});
