// Demo-grade, client-side gate — mirrors the single credential on the
// deployed prescriptions.netscribes.com dashboard. NOT real security.
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
