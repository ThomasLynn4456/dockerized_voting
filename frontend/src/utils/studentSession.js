const STUDENT_STORAGE_KEY = "univote_logged_student";

export async function fetchCurrentStudent() {
  try {
    const response = await fetch("/api/voters/me", { credentials: "include" });
    if (response.ok) {
      const data = await response.json();
      localStorage.setItem(STUDENT_STORAGE_KEY, JSON.stringify(data));
      return data;
    }
  } catch (err) {
    console.warn("Backend session check failed:", err);
  }

  // Fallback to localStorage if cookie session is lost on page refresh
  try {
    const cached = localStorage.getItem(STUDENT_STORAGE_KEY);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch {
    // Ignore parse errors
  }

  return null;
}

export function saveStudentSession(studentData) {
  try {
    localStorage.setItem(STUDENT_STORAGE_KEY, JSON.stringify(studentData));
  } catch (e) {
    console.error("Failed to save student session to localStorage:", e);
  }
}

export async function logoutStudent() {
  try {
    localStorage.removeItem(STUDENT_STORAGE_KEY);
    await fetch("/api/voters/logout", {
      method: "POST",
      credentials: "include",
    });
  } catch {
    // Ignore error on logout
  }
}
