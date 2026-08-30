import { App } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'

let lastBackPressTime = 0

/**
 * Register Android hardware & gesture back button handler.
 * Gracefully navigates back in React Router or confirms exit on root page.
 */
export function registerMobileBackButton(
  navigateBack: () => boolean,
  showExitToast: (msg: string) => void
): () => void {
  if (!Capacitor.isNativePlatform()) {
    return () => {}
  }

  const listenerPromise = App.addListener('backButton', ({ canGoBack }) => {
    // 1. Check if any open modals/overlays want to handle the back button first
    const backEvent = new CustomEvent('app:modal-back', { cancelable: true })
    const handledByModal = !window.dispatchEvent(backEvent)
    if (handledByModal) {
      return
    }

    // 2. Check if router can navigate back
    const navigated = navigateBack()
    if (navigated) {
      return
    }

    // 3. At root screen: double press within 2s to exit app
    const now = Date.now()
    if (now - lastBackPressTime < 2000) {
      App.exitApp()
    } else {
      lastBackPressTime = now
      showExitToast('Tekan sekali lagi untuk keluar dari aplikasi')
    }
  })

  return () => {
    listenerPromise.then(l => l.remove()).catch(() => {})
  }
}
