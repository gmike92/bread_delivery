import { useState, useEffect } from 'react';
import { X, Share, PlusSquare, MoreVertical, Download } from 'lucide-react';

const InstallPrompt = () => {
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  useEffect(() => {
    // Check if already installed (standalone mode)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches 
      || window.navigator.standalone 
      || document.referrer.includes('android-app://');

    if (isStandalone) {
      return; // Already installed, don't show prompt
    }

    // Detect iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    setIsIOS(iOS);

    // Detect Android
    const android = /Android/.test(navigator.userAgent);
    setIsAndroid(android);

    // Check if user has dismissed the prompt before
    const dismissed = localStorage.getItem('installPromptDismissed');
    const dismissedTime = dismissed ? parseInt(dismissed) : 0;
    const oneWeek = 7 * 24 * 60 * 60 * 1000;

    // Show prompt if not dismissed or dismissed more than a week ago
    if (!dismissed || (Date.now() - dismissedTime > oneWeek)) {
      // Delay showing prompt for better UX
      setTimeout(() => {
        if (iOS || android) {
          setShowPrompt(true);
        }
      }, 3000);
    }

    // Listen for Android's beforeinstallprompt event
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('installPromptDismissed', Date.now().toString());
  };

  const handleInstallAndroid = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShowPrompt(false);
      }
      setDeferredPrompt(null);
    }
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-black/50 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="bg-gradient-to-r from-bread-500 to-bread-600 p-6 text-white text-center relative">
          <button
            onClick={handleDismiss}
            className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
          <div className="w-20 h-20 mx-auto mb-4 bg-white rounded-2xl shadow-lg flex items-center justify-center">
            <span className="text-4xl">🍞</span>
          </div>
          <h2 className="text-xl font-display font-bold">Install Bread Delivery</h2>
          <p className="text-bread-100 mt-1 text-sm">Add to your home screen for quick access</p>
        </div>

        {/* Instructions */}
        <div className="p-6">
          {isIOS ? (
            <>
              <p className="text-bread-700 font-medium mb-4 text-center">
                Install this app on your iPhone:
              </p>
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-3 bg-bread-50 rounded-xl">
                  <div className="w-10 h-10 bg-bread-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Share size={20} className="text-bread-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-bread-800">1. Tap the Share button</p>
                    <p className="text-sm text-bread-500">At the bottom of Safari</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4 p-3 bg-bread-50 rounded-xl">
                  <div className="w-10 h-10 bg-bread-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <PlusSquare size={20} className="text-bread-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-bread-800">2. Tap "Add to Home Screen"</p>
                    <p className="text-sm text-bread-500">Scroll down in the menu</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4 p-3 bg-bread-50 rounded-xl">
                  <div className="w-10 h-10 bg-bread-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-bread-600 font-bold">Add</span>
                  </div>
                  <div>
                    <p className="font-semibold text-bread-800">3. Tap "Add"</p>
                    <p className="text-sm text-bread-500">In the top right corner</p>
                  </div>
                </div>
              </div>
            </>
          ) : isAndroid ? (
            <>
              <p className="text-bread-700 font-medium mb-4 text-center">
                Install this app on your Android:
              </p>
              
              {deferredPrompt ? (
                <button
                  onClick={handleInstallAndroid}
                  className="w-full min-h-[3.5rem] px-6 py-4 bg-bread-600 text-white font-semibold text-lg rounded-xl shadow-bread flex items-center justify-center gap-3 active:scale-[0.98] transition-transform"
                >
                  <Download size={24} />
                  Install App
                </button>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-4 p-3 bg-bread-50 rounded-xl">
                    <div className="w-10 h-10 bg-bread-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <MoreVertical size={20} className="text-bread-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-bread-800">1. Tap the menu</p>
                      <p className="text-sm text-bread-500">Three dots in Chrome</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 p-3 bg-bread-50 rounded-xl">
                    <div className="w-10 h-10 bg-bread-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <PlusSquare size={20} className="text-bread-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-bread-800">2. Tap "Add to Home Screen"</p>
                      <p className="text-sm text-bread-500">Or "Install App"</p>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6">
          <button
            onClick={handleDismiss}
            className="w-full py-3 text-bread-500 font-medium text-sm hover:text-bread-700 transition-colors"
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
};

export default InstallPrompt;

