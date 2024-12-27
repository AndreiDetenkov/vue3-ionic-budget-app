export const setItem = (key: string, value: any): void => {
  localStorage.setItem(key, JSON.stringify(value));
};

export const getItem = (key: string): any | null => {
  const data: string | null = localStorage.getItem(key);

  if (data !== null) {
    return JSON.parse(data);
  }

  return null;
};
