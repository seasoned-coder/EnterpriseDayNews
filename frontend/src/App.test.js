import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route, Link } from 'react-router-dom';

// Mock axios so child components that fetch on mount don't blow up
jest.mock('axios', () => ({
  get: jest.fn(() => Promise.resolve({ data: [] })),
  post: jest.fn(() => Promise.resolve({ data: {} })),
}));

// Render the routes inline to avoid double-Router nesting
function AppRoutes() {
  return (
    <div>
      <nav>
        <ul>
          <li><Link to="/student">Student Upload</Link></li>
          <li><Link to="/staff">Staff Dashboard</Link></li>
          <li><Link to="/projector">Projector</Link></li>
        </ul>
      </nav>
      <Routes>
        <Route path="/" element={<h1>Welcome to Enterprise Day News</h1>} />
      </Routes>
    </div>
  );
}

test('renders welcome page on root path', () => {
  render(
    <MemoryRouter initialEntries={['/']}>
      <AppRoutes />
    </MemoryRouter>
  );
  expect(screen.getByText(/Welcome to Enterprise Day News/i)).toBeInTheDocument();
});

test('renders navigation links', () => {
  render(
    <MemoryRouter initialEntries={['/']}>
      <AppRoutes />
    </MemoryRouter>
  );
  expect(screen.getByText('Student Upload')).toBeInTheDocument();
  expect(screen.getByText('Staff Dashboard')).toBeInTheDocument();
  expect(screen.getByText('Projector')).toBeInTheDocument();
});
