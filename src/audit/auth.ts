// Demo-grade, client-side gate for the Conversation Audit dashboard.
// Same credential scheme as the prescription tool (its own login gate,
// mirrors the single credential on the deployed dashboards). NOT real security.
const CREDS = { email: "demo@netscribes.com", pass: "Passw0rd" };

let signedIn = false;

export function login(email: string, password: string): boolean {
  const ok =
    email.trim().toLowerCase() === CREDS.email && password === CREDS.pass;
  if (ok) signedIn = true;
  return ok;
}
export function isSignedIn() {
  return signedIn;
}
export function logout() {
  signedIn = false;
}
