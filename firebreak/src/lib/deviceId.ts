const STORAGE_KEY = "firebreak_device_id";

/** A random per-browser ID, generated once and kept in localStorage -- lets
 * the backend group one device's symptom logs together to fit that person's
 * threshold model. Not an account: no name/email, nothing that identifies
 * the person, and clearing browser data resets it. */
export function getDeviceId(): string {
  if (typeof window === "undefined") return "";

  let id = window.localStorage.getItem(STORAGE_KEY);
  if (!id) {
    id = crypto.randomUUID();
    window.localStorage.setItem(STORAGE_KEY, id);
  }
  return id;
}
