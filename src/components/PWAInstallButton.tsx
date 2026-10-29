import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, Smartphone, Monitor, Apple, CheckCircle2, X, Share2, PlusSquare, MoreVertical } from 'lucide-react';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, isAndroid, isWindows, install } = usePWAInstall();
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'android' | 'ios' | 'windows'>(
    isIOS ? 'ios' : isAndroid ? 'android' : isWindows ? 'windows' : 'android'
  );

  // If already installed and running inside the standalone app window, hide or show minimal status
  if (isInstalled) {
    return (
      <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
        <CheckCircle2 size={14} />
        <span>Installed App</span>
      </div>
    );
  }

  const handleAction = async () => {
    if (isInstallable) {
      const outcome = await install();
      if (!outcome) {
        // If user dismissed or prompt failed, open help dialog
        setShowModal(true);
      }
    } else {
      setShowModal(true);
    }
  };

  return (
    <>
      <button
        onClick={handleAction}
        className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-md shadow-blue-500/20 hover:shadow-blue-500/30 transition-all duration-200 cursor-pointer active:scale-95 print:hidden"
        title="Download and install application on Android, iPhone, or Windows"
      >
        <Download size={14} className="animate-bounce" />
        <span>Download App</span>
      </button>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in print:hidden">
          <div className="relative w-full max-w-md rounded-2xl bg-[#0f172a] border border-zinc-800 text-zinc-100 shadow-2xl p-6 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                  <Download size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Download KDB Levy App</h3>
                  <p className="text-[11px] text-zinc-400">Install directly onto your home screen or desktop</p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
                aria-label="Close dialog"
              >
                <X size={18} />
              </button>
            </div>

            {/* Quick Install Trigger if supported by browser */}
            {isInstallable && (
              <div className="my-4 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-between">
                <span className="text-xs text-blue-300 font-medium">1-Click Fast Install Available</span>
                <button
                  onClick={async () => {
                    await install();
                    setShowModal(false);
                  }}
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition shadow-sm cursor-pointer"
                >
                  Install Now
                </button>
              </div>
            )}

            {/* Device Tabs */}
            <div className="grid grid-cols-3 gap-1 bg-zinc-900/80 p-1 rounded-xl my-4 border border-zinc-800">
              <button
                onClick={() => setActiveTab('android')}
                className={`flex items-center justify-center gap-1.5 py-2 px-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'android'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                }`}
              >
                <Smartphone size={13} />
                <span>Android</span>
              </button>

              <button
                onClick={() => setActiveTab('ios')}
                className={`flex items-center justify-center gap-1.5 py-2 px-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'ios'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                }`}
              >
                <Apple size={13} />
                <span>iPhone / iOS</span>
              </button>

              <button
                onClick={() => setActiveTab('windows')}
                className={`flex items-center justify-center gap-1.5 py-2 px-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'windows'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                }`}
              >
                <Monitor size={13} />
                <span>Windows PC</span>
              </button>
            </div>

            {/* Platform Instructions */}
            <div className="space-y-3 min-h-[140px] text-xs text-zinc-300">
              {activeTab === 'android' && (
                <div className="space-y-2.5 bg-zinc-900/60 p-3.5 rounded-xl border border-zinc-800/70">
                  <div className="flex items-start gap-2.5">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 font-bold flex items-center justify-center text-[10px]">1</span>
                    <p className="leading-relaxed">Open this web link in <strong>Google Chrome</strong> or <strong>Samsung Internet</strong>.</p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 font-bold flex items-center justify-center text-[10px]">2</span>
                    <p className="leading-relaxed flex items-center gap-1 flex-wrap">
                      Tap the <strong>menu icon (<MoreVertical size={13} className="inline text-zinc-400" />)</strong> at the top right.
                    </p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 font-bold flex items-center justify-center text-[10px]">3</span>
                    <p className="leading-relaxed">Select <strong>"Install app"</strong> or <strong>"Add to Home Screen"</strong> to install.</p>
                  </div>
                </div>
              )}

              {activeTab === 'ios' && (
                <div className="space-y-2.5 bg-zinc-900/60 p-3.5 rounded-xl border border-zinc-800/70">
                  <div className="flex items-start gap-2.5">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 font-bold flex items-center justify-center text-[10px]">1</span>
                    <p className="leading-relaxed">Open this page in <strong>Apple Safari</strong> on your iPhone or iPad.</p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 font-bold flex items-center justify-center text-[10px]">2</span>
                    <p className="leading-relaxed flex items-center gap-1 flex-wrap">
                      Tap the <strong>Share</strong> button (<Share2 size={13} className="inline text-blue-400" />) at the bottom toolbar.
                    </p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 font-bold flex items-center justify-center text-[10px]">3</span>
                    <p className="leading-relaxed flex items-center gap-1 flex-wrap">
                      Scroll down and tap <strong>"Add to Home Screen" (<PlusSquare size={13} className="inline text-zinc-400" />)</strong>, then tap <strong>Add</strong>.
                    </p>
                  </div>
                </div>
              )}

              {activeTab === 'windows' && (
                <div className="space-y-2.5 bg-zinc-900/60 p-3.5 rounded-xl border border-zinc-800/70">
                  <div className="flex items-start gap-2.5">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 font-bold flex items-center justify-center text-[10px]">1</span>
                    <p className="leading-relaxed">Open in <strong>Microsoft Edge</strong> or <strong>Google Chrome</strong> on your PC.</p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 font-bold flex items-center justify-center text-[10px]">2</span>
                    <p className="leading-relaxed">Look for the <strong>Install App icon (<Download size={13} className="inline text-blue-400" />)</strong> in the right side of the address bar.</p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 font-bold flex items-center justify-center text-[10px]">3</span>
                    <p className="leading-relaxed">Click <strong>"Install"</strong> to add an icon to your desktop, taskbar, and Start menu.</p>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="mt-5 pt-3 border-t border-zinc-800 flex justify-end">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
