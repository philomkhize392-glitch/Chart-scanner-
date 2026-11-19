import { useState } from 'react';
import { Download, Share, Smartphone, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export function PWAInstallButton() {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  const handleClick = async () => {
    if (isInstallable) {
      await install();
      return;
    }
    setShowGuide(true);
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className="inline-flex items-center gap-1.5 min-h-[36px] px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-semibold whitespace-nowrap shrink-0 transition-colors"
      >
        <Download className="w-3.5 h-3.5 shrink-0" />
        <span>Install App</span>
      </button>

      {showGuide && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="install-app-title"
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-xs p-4"
          onClick={() => setShowGuide(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-white/[0.1] bg-[#11141A] p-5 space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0">
                  <Smartphone className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <h2 id="install-app-title" className="text-sm font-semibold text-white">
                    Install ChartScope App
                  </h2>
                  <p className="text-xs text-gray-400">
                    Add to your home screen or desktop apps
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                aria-label="Close install instructions"
                className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-white/[0.06] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {isIOS ? (
              <ol className="space-y-2.5 text-xs text-gray-300 leading-relaxed">
                <li className="flex items-start gap-2.5 rounded-xl border border-white/[0.06] bg-[#0D1015] p-3">
                  <span className="font-mono text-emerald-400 font-semibold">1.</span>
                  <span>
                    Open this app directly in Safari (outside embedded frames) and tap the{' '}
                    <strong className="text-white inline-flex items-center gap-1">
                      Share <Share className="w-3 h-3 inline" />
                    </strong>{' '}
                    button.
                  </span>
                </li>
                <li className="flex items-start gap-2.5 rounded-xl border border-white/[0.06] bg-[#0D1015] p-3">
                  <span className="font-mono text-emerald-400 font-semibold">2.</span>
                  <span>
                    Scroll down and select <strong className="text-white">Add to Home Screen</strong>.
                  </span>
                </li>
              </ol>
            ) : (
              <ol className="space-y-2.5 text-xs text-gray-300 leading-relaxed">
                <li className="flex items-start gap-2.5 rounded-xl border border-white/[0.06] bg-[#0D1015] p-3">
                  <span className="font-mono text-emerald-400 font-semibold">1.</span>
                  <span>
                    Open the shared app URL in a direct Chrome or Edge browser tab (outside the embedded preview frame).
                  </span>
                </li>
                <li className="flex items-start gap-2.5 rounded-xl border border-white/[0.06] bg-[#0D1015] p-3">
                  <span className="font-mono text-emerald-400 font-semibold">2.</span>
                  <span>
                    Tap the browser menu <strong className="text-white">⋮ → Add to Home screen / Install app</strong>, or click the address-bar install icon on desktop.
                  </span>
                </li>
              </ol>
            )}

            <button
              type="button"
              onClick={() => setShowGuide(false)}
              className="w-full min-h-[44px] rounded-xl bg-[#171B22] hover:bg-[#1E242E] border border-white/[0.1] text-xs font-semibold text-white transition-colors"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
}
