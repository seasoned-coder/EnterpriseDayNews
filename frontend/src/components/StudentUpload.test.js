import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import axios from 'axios';
import StudentUpload from './StudentUpload';

jest.mock('axios');

describe('StudentUpload', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders form fields', () => {
    render(<StudentUpload />);
    expect(screen.getByText(/Student Upload/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Username/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Upload/i })).toBeInTheDocument();
  });

  test('updates username field when typed', () => {
    render(<StudentUpload />);
    const input = screen.getByPlaceholderText(/Username/i);
    fireEvent.change(input, { target: { value: 'alice' } });
    expect(input.value).toBe('alice');
  });

  test('submits file with correct headers on success', async () => {
    axios.post.mockResolvedValue({ data: {} });
    const { container } = render(<StudentUpload />);

    const file = new File(['hello'], 'photo.png', { type: 'image/png' });
    const fileInput = container.querySelector('input[type="file"]');
    fireEvent.change(fileInput, { target: { files: [file] } });

    fireEvent.click(screen.getByRole('button', { name: /Upload/i }));

    await waitFor(() => expect(axios.post).toHaveBeenCalledTimes(1));
    const [url, formData, config] = axios.post.mock.calls[0];
    expect(url).toBe('/api/student/upload');
    expect(formData).toBeInstanceOf(FormData);
    expect(config.headers['X-User']).toBe('student1');
    expect(config.headers['X-Role']).toBe('STUDENT');
    expect(await screen.findByText(/Upload successful!/i)).toBeInTheDocument();
  });

  test('shows failure message on error', async () => {
    axios.post.mockRejectedValue(new Error('boom'));
    const { container } = render(<StudentUpload />);

    const file = new File(['hello'], 'photo.png', { type: 'image/png' });
    const fileInput = container.querySelector('input[type="file"]');
    fireEvent.change(fileInput, { target: { files: [file] } });

    fireEvent.click(screen.getByRole('button', { name: /Upload/i }));

    expect(await screen.findByText(/Upload failed\./i)).toBeInTheDocument();
  });

  test('does not submit when no file is chosen', () => {
    render(<StudentUpload />);
    fireEvent.click(screen.getByRole('button', { name: /Upload/i }));
    expect(axios.post).not.toHaveBeenCalled();
  });
});
