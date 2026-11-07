
import React, { useState, useMemo, useEffect } from 'react';
import {
  Plus,
  Trash2,
  Calculator,
  Download,
  RefreshCcw,
  TrendingUp,
  AlertCircle,
  FileText,
  Settings as SettingsIcon,
  Calendar,
  Layers,
  Upload,
  Image as ImageIcon,
  User,
  Sun,
  Moon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { PWAInstallButton } from './components/PWAInstallButton';
import { OfflineIndicator } from './components/OfflineIndicator';
import {
  activateDevice,
  loadDeviceContext,
  refreshDeviceConfiguration,
  type CompanyConfig,
  type DeviceContext
} from './config/companyConfig';

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const DEFAULT_PRICE = 0.40;
const DEFAULT_CF = 50;

// Helper to format date strictly as DD/MM/YYYY
const formatDateDDMMYYYY = (d: Date = new Date()): string => {
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

// Helper to capitalize the first letter of each word/name only
const toTitleCase = (str: string): string => {
  if (!str) return '';
  return str.replace(/\b([a-zA-Z])([a-zA-Z]*)/g, (_, first, rest) => {
    return first.toUpperCase() + rest.toLowerCase();
  });
};

// Helper to format and subtract months
const getMonthLabel = (baseDate: Date, arrearsIndex: number) => {
  const d = new Date(baseDate);
  // Pattern: m=0 and m=1 are the same month. m=2 is base-1, m=3 is base-2...
  const monthsToSubtract = arrearsIndex <= 1 ? 0 : arrearsIndex - 1;
  d.setMonth(d.getMonth() - monthsToSubtract);

  return d.toLocaleString('default', { month: 'short' }) + '-' + d.getFullYear().toString().slice(-2);
};

const getBandedCF = (amount: number) => {
  if (amount <= 0) return 0;
  if (amount < 199) return 5;
  if (amount < 300) return 10;
  if (amount < 500) return 15;
  if (amount < 700) return 20;
  if (amount < 1000) return 25;
  return 50;
};

export default function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      return (saved === 'light' || saved === 'dark') ? saved : 'dark';
    }
    return 'dark';
  });

  const [baseMonth, setBaseMonth] = useState('2026-01');
  const [arrearsCount, setArrearsCount] = useState<number | ''>(1);
  const [price, setPrice] = useState<number | ''>(DEFAULT_PRICE);
  const [pricingMode, setPricingMode] = useState<'general' | 'individual'>('general');
  const [pricesMap, setPricesMap] = useState<Record<number, number | ''>>({});

  // Store litres in a map keyed by arrears index to persist values when count changes
  const [litresMap, setLitresMap] = useState<Record<number, number | ''>>({});

  const [signature, setSignature] = useState<string | null>(null);
  const [officerName, setOfficerName] = useState<string>('');
  const [dboName, setDboName] = useState<string>('');
  const [companyConfig, setCompanyConfig] = useState<CompanyConfig | null>(null);
  const [configStatus, setConfigStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [configSource, setConfigSource] = useState<'network' | 'local' | null>(null);
  const [configError, setConfigError] = useState<string>('');
  const [deviceContext, setDeviceContext] = useState<DeviceContext | null>(null);
  const [activationCode, setActivationCode] = useState('');
  const [activationUserName, setActivationUserName] = useState('');
  const [isActivating, setIsActivating] = useState(false);

  useEffect(() => {
    let mounted = true;

    loadDeviceContext()
      .then(({ context, source }) => {
        if (!mounted) return;

        setDeviceContext(context);

        if (context.config) {
          setCompanyConfig(context.config);
          setConfigSource(source);
          setConfigStatus('ready');
          setConfigError('');
        } else {
          setConfigStatus('error');
          setConfigError('Device activated. Connect to the internet to download its assigned branch configuration.');
        }
      })
      .catch((error: unknown) => {
        if (!mounted) return;

        setConfigStatus('error');
        setConfigError(error instanceof Error ? error.message : 'Unable to load device configuration');
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!deviceContext) return;

    let mounted = true;
    let syncInFlight = false;

    const sync = async () => {
      // Do not repeatedly attempt network requests while the device is offline,
      // and do not allow overlapping checks from the timer and browser events.
      if (!navigator.onLine || syncInFlight) return;

      syncInFlight = true;

      try {
        const updated = await refreshDeviceConfiguration(deviceContext);

        if (!mounted) return;

        setDeviceContext(updated);
        setCompanyConfig(updated.config);
        setConfigSource('network');
        setConfigStatus('ready');
        setConfigError('');
      } catch (error) {
        if (!mounted) return;

        const message = error instanceof Error ? error.message : 'Could not synchronise configuration';
        const status = (error as { status?: number })?.status;

        // Only an explicit server-side rejection (revocation/inactive branch or
        // missing company setup) blocks the cached installation. Network failures
        // leave the last approved offline configuration available.
        if (status === 401 || status === 403 || status === 404) {
          setCompanyConfig(null);
          setConfigStatus('error');
          setConfigError(message);
        } else if (deviceContext.config) {
          setCompanyConfig(deviceContext.config);
          setConfigSource('local');
          setConfigStatus('ready');
        }
      } finally {
        syncInFlight = false;
      }
    };

    const syncWhenVisible = () => {
      if (document.visibilityState === 'visible') void sync();
    };

    // Recheck on startup, reconnection, when the app returns to the foreground,
    // and every five minutes while open. Offline use remains available.
    void sync();

    const intervalId = window.setInterval(() => void sync(), 5 * 60 * 1000);

    window.addEventListener('online', sync);
    document.addEventListener('visibilitychange', syncWhenVisible);

    return () => {
      mounted = false;
      window.clearInterval(intervalId);
      window.removeEventListener('online', sync);
      document.removeEventListener('visibilitychange', syncWhenVisible);
    };
  }, [deviceContext]);

  const selectedBranch = companyConfig?.branch ?? null;

  const handleDeviceActivation = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!activationCode.trim() || !activationUserName.trim()) return;

    setIsActivating(true);
    setConfigError('');

    try {
      const activated = await activateDevice(
        activationCode,
        activationUserName
      );

      setDeviceContext(activated);
      setCompanyConfig(activated.config);
      setConfigSource('network');
      setConfigStatus('ready');
      setActivationCode('');
      setActivationUserName('');
    } catch (error) {
      // If activation succeeded but the immediate configuration download was
      // interrupted, recover the newly saved device credential without asking
      // the user to redeem the now-consumed code again.
      try {
        const recovered = await loadDeviceContext();

        setDeviceContext(recovered.context);

        if (recovered.context.config) {
          setCompanyConfig(recovered.context.config);
          setConfigSource(recovered.source);
          setConfigStatus('ready');
          setConfigError('');
          return;
        }
      } catch {
        // Fall through to the original activation/configuration error.
      }

      setConfigStatus('error');
      setConfigError(error instanceof Error ? error.message : 'Activation failed');
    } finally {
      setIsActivating(false);
    }
  };

  useEffect(() => {
    const root = window.document.documentElement;

    if (theme === 'light') {
      root.classList.add('light');
    } else {
      root.classList.remove('light');
    }

    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    const date = new Date().toISOString().split('T')[0];
    const name = dboName ? `_${dboName}` : '';
    document.title = `KDB_Estimate${name}_${date}`;
  }, [dboName]);

  const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    if (file) {
      const reader = new FileReader();

      reader.onloadend = () => {
        setSignature(reader.result as string);
      };

      reader.readAsDataURL(file);
    }
  };

  const baseDate = useMemo(() => new Date(baseMonth + '-01'), [baseMonth]);

  const rows = useMemo(() => {
    const result = [];
    const count = typeof arrearsCount === 'number' && !isNaN(arrearsCount) ? Math.max(0, arrearsCount) : 0;
    const defaultPriceVal = typeof price === 'number' && !isNaN(price) ? price : 0;

    // We go from 0 to count
    for (let m = 0; m <= count; m++) {
      const monthLabel = getMonthLabel(baseDate, m);
      const rawLitres = litresMap[m];
      const litres = typeof rawLitres === 'number' && !isNaN(rawLitres) ? rawLitres : 0;

      const rawIndivPrice = pricesMap[m];
      const currentPrice = pricingMode === 'individual'
        ? (typeof rawIndivPrice === 'number' && !isNaN(rawIndivPrice) ? rawIndivPrice : defaultPriceVal)
        : defaultPriceVal;

      const levy = Math.ceil(litres * currentPrice);

      let penaltyRate = 0;
      let compoundingFactor = 0;

      if (m === 1) {
        penaltyRate = 0.25;
        compoundingFactor = 1.0;
      } else if (m > 1) {
        // Formula: (1.25 * (1.12 ^ (m-1))) - 1
        compoundingFactor = Math.pow(1.12, m - 1);
        penaltyRate = (1.25 * compoundingFactor) - 1;
      }

      const penalty = Math.ceil(levy * penaltyRate);
      const amount = levy + penalty;
      // CF fee is banded based on the amount (levy + penalty)
      const rowCf = litres > 0 ? getBandedCF(amount) : 0;
      const total = litres > 0 ? amount + rowCf : 0;

      result.push({
        m,
        month: monthLabel,
        litres,
        price: currentPrice,
        priceInput: rawIndivPrice,
        levy,
        penalty,
        penaltyRate,
        compoundingFactor,
        amount,
        cf: rowCf,
        total
      });
    }

    return result;
  }, [baseDate, arrearsCount, price, pricingMode, pricesMap, litresMap]);

  const totals = useMemo(() => {
    return rows.reduce((acc, row) => ({
      levy: acc.levy + row.levy,
      penalty: acc.penalty + row.penalty,
      amount: acc.amount + row.amount,
      cf: acc.cf + row.cf,
      total: acc.total + row.total,
      litres: acc.litres + row.litres
    }), { levy: 0, penalty: 0, amount: 0, cf: 0, total: 0, litres: 0 });
  }, [rows]);

  const updateLitres = (m: number, val: number | '') => {
    setLitresMap(prev => ({ ...prev, [m]: val }));
  };

  const updatePrice = (m: number, val: number | '') => {
    setPricesMap(prev => ({ ...prev, [m]: val }));
  };

  const chartData = [
    { name: 'Levy', value: totals.levy, color: '#3b82f6' },
    { name: 'Penalty', value: totals.penalty, color: '#ef4444' },
    { name: 'CF Fees', value: totals.cf, color: '#10b981' },
  ];

  const validityDate = useMemo(() => {
    const lastDay = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);
    return lastDay.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  }, []);

  if (configStatus !== 'ready' || !companyConfig || !selectedBranch) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 md:p-8">
        <div className="w-full max-w-md glass-card rounded-2xl p-6 md:p-8 space-y-6">
          <div className="flex items-center gap-3">
            <TrendingUp className="text-blue-500" size={30} />
            <div>
              <h1 className="text-2xl font-bold text-[var(--text-main)]">KDB Levy Calculator</h1>
              <p className="text-xs text-zinc-500">Device activation</p>
            </div>
          </div>

          {configStatus === 'loading' ? (
            <div className="flex items-center gap-3 text-sm text-zinc-500">
              <RefreshCcw className="animate-spin" size={18} />
              Checking this device’s activation...
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <h2 className="text-lg font-semibold text-[var(--text-main)]">Activate this installation</h2>
                <p className="text-sm text-zinc-500">
                  Enter the single-use activation code issued by your administrator. This device will be assigned to one branch.
                </p>
              </div>

              <form onSubmit={handleDeviceActivation} className="space-y-4">
                <div className="space-y-1.5">
                  <label
                    htmlFor="activation-user-name"
                    className="block text-sm font-medium text-[var(--text-main)]"
                  >
                    User name *
                  </label>

                  <input
                    id="activation-user-name"
                    type="text"
                    value={activationUserName}
                    onChange={(event) => setActivationUserName(event.target.value)}
                    placeholder="Enter your full name"
                    autoComplete="name"
                    maxLength={100}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--input-bg)] px-4 py-3 text-sm text-[var(--text-main)] outline-none focus:border-blue-500"
                    disabled={isActivating}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="activation-code"
                    className="block text-sm font-medium text-[var(--text-main)]"
                  >
                    Activation code *
                  </label>

                  <input
                    id="activation-code"
                    type="text"
                    value={activationCode}
                    onChange={(event) => setActivationCode(event.target.value)}
                    placeholder="Enter activation code"
                    autoComplete="off"
                    autoCapitalize="characters"
                    spellCheck={false}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--input-bg)] px-4 py-3 font-mono text-sm tracking-wider text-[var(--text-main)] outline-none focus:border-blue-500"
                    disabled={isActivating}
                    required
                  />
                </div>

                {configError && (
                  <p className="text-sm text-red-500" role="alert">
                    {configError}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={
                    isActivating ||
                    !activationCode.trim() ||
                    !activationUserName.trim()
                  }
                  className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isActivating ? 'Activating device...' : 'Activate device'}
                </button>
              </form>

              <p className="text-xs text-zinc-500">
                An internet connection is required for first-time activation. Once activated, the calculator can continue working offline using its saved branch configuration.
              </p>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      {/* Official Print Header (Hidden on Screen) */}
      <div className="hidden print:block text-center space-y-1 mb-8 border-b-2 border-black pb-6">
        {companyConfig && selectedBranch ? (
          <>
            <h2 className="text-xl font-bold uppercase">
              {companyConfig.company.name} - {selectedBranch.name}
            </h2>

            {selectedBranch.address && (
              <p className="text-sm">{selectedBranch.address}</p>
            )}

            {(selectedBranch.telephone || selectedBranch.email || companyConfig.company.website) && (
              <p className="text-sm">
                {[
                  selectedBranch.telephone ? `Tel: ${selectedBranch.telephone}` : '',
                  selectedBranch.email ? `Email: ${selectedBranch.email}` : '',
                  companyConfig.company.website ? `Website: ${companyConfig.company.website}` : ''
                ].filter(Boolean).join(' | ')}
              </p>
            )}

            {companyConfig.company.registeredOffice?.address && (
              <p className="text-xs">
                Registered Office: {companyConfig.company.registeredOffice.address}
              </p>
            )}
          </>
        ) : (
          <div className="p-3 border-2 border-red-600 text-red-700 font-bold text-sm bg-red-50 rounded">
            CONFIGURATION ERROR: Please select an official issuing branch before printing this estimate.
          </div>
        )}

        <div className="pt-2 text-center">
          <h1 className="text-2xl font-black underline decoration-2 underline-offset-4">
            CONSUMER SAFETY LEVY ESTIMATE
          </h1>
        </div>

        {dboName && (
          <p className="mt-4 text-xs font-bold text-left">
            To:&nbsp;&nbsp;&nbsp;&nbsp;{dboName}
          </p>
        )}

        <div className="flex justify-between pt-6 text-xs font-mono">
          <span>
            PRICE PER LITRE: Ksh {pricingMode === 'general' ? (typeof price === 'number' ? price.toFixed(2) : '0.00') : 'Variable'}
          </span>
          <span>DATE: {formatDateDDMMYYYY(new Date())}</span>
        </div>
      </div>

      {/* Header Section (Hidden on Print) */}
      <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 print:hidden">
        <div className="flex flex-col gap-4 w-full lg:w-auto">
          <div className="flex items-center justify-between gap-6 w-full lg:min-w-[400px]">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="text-blue-500" size={28} />
                <h1 className="text-3xl font-bold tracking-tight text-[var(--text-main)] transition-colors">
                  KDB Levy Calculator
                </h1>
              </div>
              <p className="text-zinc-500 text-sm">
                Official utility compounding & arrears sequencing
              </p>
            </div>

            <div className="flex items-center gap-2">
              <PWAInstallButton />
              <button
                onClick={() => setTheme(curr => curr === 'dark' ? 'light' : 'dark')}
                className="p-2.5 rounded-xl glass-card text-[var(--text-main)] hover:bg-[var(--accent)]/10 cursor-pointer transition-all duration-200 border border-[var(--border)] active:scale-95"
                aria-label="Toggle Theme"
                title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
              >
                {theme === 'dark' ? (
                  <Sun className="text-amber-400" size={18} />
                ) : (
                  <Moon className="text-blue-600" size={18} />
                )}
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-1 max-w-xs">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">
              Assigned Branch
            </label>
            <div className="flex items-center gap-2 glass-card px-3 py-2">
              <Layers size={14} className="text-zinc-500" />
              <span className="font-mono text-xs text-[var(--text-main)]">
                {selectedBranch?.name || (configStatus === 'loading' ? 'Loading device assignment...' : 'Not activated')}
              </span>
            </div>
            <p className="text-[10px] text-zinc-500">
              This installation is locked to its administrator-assigned branch.
            </p>
            {configStatus === 'ready' && configSource === 'local' && (
              <p className="text-[10px] text-amber-500">Using saved offline configuration</p>
            )}
          </div>

          <div className="flex flex-col gap-1 max-w-xs">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">
              To: DBO Name
            </label>
            <div className="flex items-center gap-2 glass-card px-3 py-2">
              <User size={14} className="text-zinc-500" />
              <input
                type="text"
                value={dboName}
                onChange={(e) => setDboName(e.target.value)}
                placeholder="Enter DBO Name"
                className="bg-transparent font-mono text-xs focus:outline-none w-full text-[var(--text-main)] placeholder-zinc-500/50"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full lg:w-auto">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">
              Start Month
            </label>
            <div className="flex items-center gap-2 glass-card px-3 py-2">
              <Calendar size={14} className="text-zinc-500" />
              <input
                type="month"
                value={baseMonth}
                onChange={(e) => setBaseMonth(e.target.value)}
                className="bg-transparent font-mono text-xs focus:outline-none w-full"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">
              Arrears Count
            </label>
            <div className="flex items-center gap-2 glass-card px-3 py-2">
              <Layers size={14} className="text-zinc-500" />
              <input
                type="number"
                value={arrearsCount}
                onChange={(e) => {
                  const val = e.target.value;

                  if (val === '') {
                    setArrearsCount('');
                  } else {
                    const parsed = parseInt(val, 10);
                    setArrearsCount(isNaN(parsed) ? '' : Math.max(0, parsed));
                  }
                }}
                placeholder="1"
                min="0"
                className="bg-transparent font-mono text-xs focus:outline-none w-full"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">
              Pricing Mode
            </label>
            <div className="flex items-center gap-1 glass-card p-1">
              <button
                onClick={() => setPricingMode('general')}
                className={cn(
                  "flex-1 py-1.5 px-3 rounded-lg text-[10px] font-bold transition-all",
                  pricingMode === 'general'
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20"
                    : "text-zinc-500 dark:text-zinc-400 hover:text-[var(--text-main)]"
                )}
              >
                GENERAL
              </button>
              <button
                onClick={() => setPricingMode('individual')}
                className={cn(
                  "flex-1 py-1.5 px-3 rounded-lg text-[10px] font-bold transition-all",
                  pricingMode === 'individual'
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20"
                    : "text-zinc-500 dark:text-zinc-400 hover:text-[var(--text-main)]"
                )}
              >
                INDIVIDUAL
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">
              {pricingMode === 'general' ? 'General Price' : 'Default Price'}
            </label>
            <div className="flex items-center gap-2 glass-card px-3 py-2">
              <span className="text-zinc-500 text-xs">Ksh</span>
              <input
                type="number"
                value={price}
                onChange={(e) => {
                  const val = e.target.value;

                  if (val === '') {
                    setPrice('');
                  } else {
                    const parsed = parseFloat(val);
                    setPrice(isNaN(parsed) ? '' : parsed);
                  }
                }}
                placeholder="0.40"
                className="bg-transparent font-mono text-xs focus:outline-none w-full"
                step="0.01"
                min="0"
              />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Left: Calculation Table */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-card overflow-hidden print:border-none print:shadow-none">
            <div className="overflow-x-auto">
              <table className="w-full data-table print:font-condensed">
                <thead>
                  <tr>
                    <th>Month</th>
                    <th>Arrears (m)</th>
                    <th>Litres</th>
                    {pricingMode === 'individual' && <th>Price</th>}
                    <th>Levy</th>
                    <th className="print:hidden">Penalty %</th>
                    <th>Penalty (Ksh)</th>
                    <th className="print:hidden">Amount</th>
                    <th>CF Fee</th>
                    <th>Total (Ksh)</th>
                  </tr>
                </thead>

                <tbody>
                  <AnimatePresence initial={false}>
                    {rows.map((row) => (
                      <motion.tr
                        key={row.m}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className={cn(
                          "hover:bg-[var(--accent)]/[0.04] transition-colors duration-200",
                          row.litres === 0 && "print:hidden"
                        )}
                      >
                        <td className="font-bold text-[var(--text-main)] print:text-black">
                          {row.month}
                        </td>
                        <td className="text-zinc-500 dark:text-zinc-400 print:text-black">
                          {row.m}
                        </td>
                        <td>
                          <input
                            type="number"
                            value={litresMap[row.m] !== undefined && litresMap[row.m] !== '' ? litresMap[row.m] : ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              updateLitres(row.m, val === '' ? '' : parseFloat(val));
                            }}
                            placeholder="0"
                            className="bg-transparent w-20 focus:outline-none font-bold text-blue-500 dark:text-blue-400 print:text-black placeholder-zinc-500/40"
                            min="0"
                          />
                        </td>

                        {pricingMode === 'individual' && (
                          <td>
                            <input
                              type="number"
                              value={row.priceInput !== undefined && row.priceInput !== '' ? row.priceInput : ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                updatePrice(row.m, val === '' ? '' : parseFloat(val));
                              }}
                              placeholder={typeof price === 'number' ? price.toString() : '0.40'}
                              className="bg-transparent w-16 focus:outline-none font-mono text-xs text-zinc-500 dark:text-zinc-400 print:text-black"
                              step="0.01"
                              min="0"
                            />
                          </td>
                        )}

                        <td className="text-[var(--text-main)]/90 print:text-black">
                          {row.levy.toLocaleString()}
                        </td>
                        <td className="text-zinc-500 dark:text-zinc-400 text-[10px] print:hidden">
                          {(row.penaltyRate * 100).toFixed(1) + '%'}
                        </td>
                        <td className="text-red-500 dark:text-red-400/80 print:text-black">
                          {row.penalty.toLocaleString()}
                        </td>
                        <td className="text-[var(--text-main)]/80 font-bold print:hidden">
                          {row.amount.toLocaleString()}
                        </td>
                        <td className="text-emerald-600 dark:text-emerald-400/80 print:text-black">
                          {row.cf.toLocaleString()}
                        </td>
                        <td className="font-bold text-[var(--text-main)] bg-[var(--accent)]/[0.04] print:bg-transparent print:text-black">
                          {row.total.toLocaleString()}
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>

                <tfoot>
                  <tr className="bg-[var(--accent)]/[0.03] dark:bg-white/[0.05] font-bold print:bg-zinc-100">
                    <td colSpan={2} className="text-xs uppercase tracking-widest text-[var(--text-dim)] print:text-black">
                      Totals
                    </td>
                    <td className="text-blue-500 dark:text-blue-400 print:hidden">
                      {totals.litres.toLocaleString()}
                    </td>
                    <td className="hidden print:table-cell"></td>
                    {pricingMode === 'individual' && <td></td>}
                    <td className="print:text-black">{totals.levy.toLocaleString()}</td>
                    <td className="print:hidden"></td>
                    <td className="text-red-500 dark:text-red-400 print:text-black">
                      {totals.penalty.toLocaleString()}
                    </td>
                    <td className="print:hidden"></td>
                    <td className="text-emerald-500 dark:text-emerald-400 print:text-black">
                      {totals.cf.toLocaleString()}
                    </td>
                    <td className="text-blue-600 dark:text-blue-400 text-lg print:text-black print:text-sm">
                      {totals.total.toLocaleString()}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Validity Date & Total (Hidden on Screen) */}
            <div className="hidden print:block mt-6 px-4">
              <div className="space-y-6">
                <div className="text-right">
                  <p className="text-xs font-bold italic">
                    This estimate is valid through {validityDate}; figures subject to recalculation thereafter
                  </p>
                </div>

                <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-lg w-fit">
                  <p className="text-zinc-500 text-[10px] uppercase tracking-widest text-black mb-1">
                    Grand Total Due (Ksh)
                  </p>
                  <p className="text-2xl font-bold tracking-tighter text-black">
                    {totals.total.toLocaleString()}
                  </p>
                </div>

                <p className="text-sm italic leading-relaxed text-zinc-700 max-w-2xl">
                  Levy is due before the 10th of every month and is payable immediately upon submission, as stipulated by the Dairy Industry Act (Cap 336) and its subsidiary regulations.
                </p>

                <div className="pt-8 space-y-1">
                  {signature && (
                    <div className="mb-2 ml-4">
                      <img src={signature} alt="Signature" className="h-12 object-contain" />
                    </div>
                  )}

                  {officerName && (
                    <p className="text-sm font-bold border-b border-black pb-1 mb-1 w-fit min-w-[200px]">
                      {toTitleCase(officerName)}
                    </p>
                  )}

                  <p className="text-[10px] uppercase font-bold tracking-widest">
                    Authorized Signature
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Logic Breakdown (Hidden on Print) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:hidden">
            <div className="glass-card p-6 space-y-4">
              <div className="flex items-center gap-2 text-[var(--text-dim)]">
                <Calculator size={18} />
                <h3 className="text-sm font-bold uppercase tracking-widest">
                  Compounding Logic
                </h3>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-500 dark:text-zinc-400">Base Penalty (m=1)</span>
                  <span className="font-mono text-blue-600 dark:text-blue-400">25.0%</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-500 dark:text-zinc-400">Compounding Rate</span>
                  <span className="font-mono text-blue-600 dark:text-blue-400">12.0% Monthly</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-500 dark:text-zinc-400">Formula (m &gt; 1)</span>
                  <span className="font-mono text-zinc-700 dark:text-zinc-300">(1.25 * 1.12^(m-1)) - 1</span>
                </div>
              </div>
            </div>

            <div className="glass-card p-6 space-y-4">
              <div className="flex items-center gap-2 text-[var(--text-dim)]">
                <AlertCircle size={18} />
                <h3 className="text-sm font-bold uppercase tracking-widest">
                  Sequence Pattern
                </h3>
              </div>

              <div className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                <p>• <span className="text-zinc-700 dark:text-zinc-300">m=0:</span> Current month, no penalty.</p>
                <p>• <span className="text-zinc-700 dark:text-zinc-300">m=1:</span> Current month, 25% penalty.</p>
                <p>• <span className="text-zinc-700 dark:text-zinc-300">m=2+:</span> Previous months, compounded penalty.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Summary */}
        <div className="space-y-6">
          <div className="glass-card p-6 print:hidden">
            <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-500 mb-6">
              Cost Distribution
            </h3>

            <div className="h-[240px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>

                  <Tooltip
                    contentStyle={{
                      backgroundColor: theme === 'dark' ? '#141417' : '#ffffff',
                      border: theme === 'dark' ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #e2e8f0',
                      borderRadius: '8px',
                      color: theme === 'dark' ? '#f4f4f5' : '#0f172a'
                    }}
                    itemStyle={{ color: theme === 'dark' ? '#f4f4f5' : '#0f172a' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-3 mt-4">
              {chartData.map((item) => (
                <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-xs text-[var(--text-dim)]">{item.name}</span>
                  </div>
                  <span className="text-xs font-mono">
                    {item.value.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-card p-4 bg-blue-500/5 border-blue-500/20 print:hidden">
            <div className="flex justify-between items-start mb-2">
              <div className="p-1.5 bg-blue-500/10 rounded-lg text-blue-500">
                <FileText size={18} />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-blue-500/50">
                Final Invoice
              </span>
            </div>

            <div className="space-y-0.5">
              <p className="text-zinc-500 text-[10px] uppercase tracking-widest print:text-black">
                Grand Total Due (Ksh)
              </p>
              <p className="text-3xl font-bold tracking-tighter text-[var(--text-main)] print:text-black print:text-xl">
                {totals.total.toLocaleString()}
              </p>
            </div>

            <div className="mt-6 space-y-4 print:hidden">
              <div className="space-y-2">
                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">
                  Signing Officer Name
                </label>
                <div className="flex items-center gap-2 glass-card px-3 py-2">
                  <User size={14} className="text-zinc-500" />
                  <input
                    type="text"
                    value={officerName}
                    onChange={(e) => setOfficerName(e.target.value)}
                    onBlur={() => setOfficerName(prev => toTitleCase(prev))}
                    placeholder="Enter Officer Name"
                    className="bg-transparent font-mono text-xs focus:outline-none w-full text-[var(--text-main)] placeholder-zinc-500/50"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">
                  Authorized Signature
                </label>

                {signature ? (
                  <div className="flex items-center justify-between p-2.5 rounded-xl border border-[var(--border)] bg-[var(--input-bg)]/40">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-14 bg-white rounded border border-zinc-200 flex items-center justify-center p-1 shadow-sm overflow-hidden">
                        <img src={signature} alt="Uploaded signature preview" className="h-full max-w-full object-contain" />
                      </div>

                      <div>
                        <div className="flex items-center gap-1.5 text-xs text-emerald-500 font-medium">
                          <ImageIcon size={14} />
                          <span>Signature Attached</span>
                        </div>
                        <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                          Included on official estimate
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <label
                        className="px-2 py-1 text-xs text-zinc-500 dark:text-zinc-400 hover:text-[var(--text-main)] hover:bg-[var(--accent)]/10 rounded-lg cursor-pointer transition-colors"
                        title="Change signature image"
                      >
                        Change
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleSignatureUpload}
                          className="hidden"
                        />
                      </label>

                      <button
                        type="button"
                        onClick={() => setSignature(null)}
                        className="p-1.5 text-red-500 hover:text-red-600 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer flex items-center gap-1 text-xs font-medium"
                        title="Remove uploaded signature"
                        aria-label="Remove uploaded signature"
                      >
                        <Trash2 size={14} />
                        <span>Remove</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="relative group">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleSignatureUpload}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    <div className="flex items-center justify-center gap-2 py-3 border-2 border-dashed border-[var(--border)] rounded-xl group-hover:border-blue-500/50 transition-all duration-200 bg-[var(--input-bg)]/40">
                      <div className="flex items-center gap-2 text-zinc-500">
                        <Upload size={16} />
                        <span className="text-xs">Upload Signature</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={() => window.print()}
              disabled={!selectedBranch}
              title={!selectedBranch ? 'Select an issuing branch before printing' : 'Export PDF / Print'}
              className="w-full mt-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 print:hidden"
            >
              <Download size={18} />
              Export PDF / Print
            </button>
          </div>
        </div>
      </div>

      {/* Official Print Footer (Hidden on Print) */}
      <div className="hidden print:block pt-8 border-t border-zinc-200 mt-8">
      </div>

      {/* Offline Status Toast */}
      <OfflineIndicator />
    </div>
  );
}
