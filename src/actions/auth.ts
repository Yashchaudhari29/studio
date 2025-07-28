
'use server';

/**
 * Verifies the provided password against the one stored in environment variables.
 * IMPORTANT: This is a very basic form of authentication suitable only for simple
 * access control, not for secure multi-user systems.
 *
 * @param password The password entered by the user.
 * @returns A promise that resolves to true if the password is correct, false otherwise.
 */
export async function verifyPassword(password: string): Promise<boolean> {
  const correctPassword = process.env.APP_PASSWORD;

  if (!correctPassword) {
    console.error("Security Error: APP_PASSWORD environment variable is not set!");
    // In a real scenario, you might want to prevent login entirely or log this securely.
    return false; // Fail safe if the password is not configured
  }

  // Simple string comparison
  const isAuthenticated = password === correctPassword;

  // Optional: Add logging for failed attempts (be careful not to log the password itself)
  if (!isAuthenticated) {
     console.warn("Failed login attempt.");
  } else {
      console.log("Successful login attempt.");
  }


  return isAuthenticated;
}
