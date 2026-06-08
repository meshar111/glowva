const REQUIRED_PUBLIC_ENV = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"];
const REQUIRED_SERVER_ENV = ["SUPABASE_SERVICE_ROLE_KEY", "ANTHROPIC_API_KEY", "ADMIN_EMAIL"];

export function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function validatePublicEnv() {
  for (const name of REQUIRED_PUBLIC_ENV) requireEnv(name);
}

export function validateServerEnv() {
  validatePublicEnv();
  for (const name of REQUIRED_SERVER_ENV) requireEnv(name);
}

export function getRequiredEnvNames() {
  return [...REQUIRED_PUBLIC_ENV, ...REQUIRED_SERVER_ENV];
}
