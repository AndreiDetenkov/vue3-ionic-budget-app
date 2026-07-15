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

  return {
    showToast,
  };
}
