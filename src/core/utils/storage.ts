export const setItem = (key: string, value: any): void => {
  sessionStorage.setItem(key, JSON.stringify(value));
};

export const getItem = (key: string): any | null => {
  const data: string | null = sessionStorage.getItem(key);

  if (data !== null) {
    return JSON.parse(data);
  }

  return null;
};
