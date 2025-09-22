export const checkEnvVariable = (envKey: string): string => {
  if (!import.meta.env[envKey]) {
    throw new Error(`Env variable ${envKey} is required`);
  }
  return import.meta.env[envKey];
};
