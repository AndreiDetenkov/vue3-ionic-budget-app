import { ref } from 'vue';

interface SetToastProps {
  state: boolean;
  message: string;
}

export function useToast() {
  const toast = ref<{
    isOpen: boolean;
    message: string;
  }>({ isOpen: false, message: '' });

  const setToast = (prop: SetToastProps): void => {
    toast.value.isOpen = prop.state;
    toast.value.message = prop.message;
  };

  return {
    toast,
    setToast,
  };
}
