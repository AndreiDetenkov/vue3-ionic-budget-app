const checkEnvVariable = (envKey: string): string => {
  if (!import.meta.env[envKey]) {
    throw new Error(`Env variable ${envKey} is required`);
  }
  return import.meta.env[envKey];
};

export const SUPABASE_URL = checkEnvVariable('VITE_SUPABASE_URL');
export const API_KEY = checkEnvVariable('VITE_SUPABASE_ANON_KEY');
