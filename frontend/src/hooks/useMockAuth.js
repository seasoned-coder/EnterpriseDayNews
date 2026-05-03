import { useState } from 'react';

/**
 * Mock authentication hook. Replace with a real auth provider (JWT/OAuth2)
 * once the external auth API is available — components should keep using
 * this hook so the migration is a one-file change.
 */
export default function useMockAuth(defaultUsername) {
  const [username, setUsername] = useState(defaultUsername);
  return { username, setUsername };
}
