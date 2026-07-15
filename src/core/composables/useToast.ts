import { toastController, ToastOptions } from '@ionic/vue';

export function useToast() {
  const showToast = async (options: ToastOptions) => {
    const toast = await toastController.create({
      duration: 2000,
      position: 'top',
      ...options,
    });
    await toast.present();
    return toast;
  };

  const showErrorToast = (message: string, options?: Omit<ToastOptions, 'message' | 'color'>) => {
    return showToast({
      message,
      color: 'danger',
      ...options,
    });
  };

  const showSuccessToast = (message: string, options?: Omit<ToastOptions, 'message' | 'color'>) => {
    return showToast({
      message,
      color: 'success',
      ...options,
    });
  };

  return {
    showToast,
    showErrorToast,
    showSuccessToast,
  };
}
