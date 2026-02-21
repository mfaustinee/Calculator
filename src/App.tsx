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
  User
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const DEFAULT_PRICE = 0.40;
const DEFAULT_CF = 50;

// Helper to format and subtract months
const getMonthLabel = (baseDate: Date, arrearsIndex: number) => {
  const d = new Date(baseDate);
  // Pattern: m=0 and m=1 are the same month. m=2 is base-1, m=3 is base-2...
  const monthsToSubtract = arrearsIndex <= 1 ? 0 : arrearsIndex - 1;
  d.setMonth(d.getMonth() - monthsToSubtract);
  
  return d.toLocaleString('default', { month: 'short' }) + '-' + d.getFullYear().toString().slice(-2);
};

export default function App() {
  const [baseMonth, setBaseMonth] = useState('2026-01');
  const [arrearsCount, setArrearsCount] = useState(4);
  const [price, setPrice] = useState(DEFAULT_PRICE);
  const [cf, setCf] = useState(DEFAULT_CF);
  
  // Store litres in a map keyed by arrears index to persist values when count changes
  const [litresMap, setLitresMap] = useState<Record<number, number>>({
    1: 6293,
    2: 6379,
    3: 7094,
    4: 10422
  });

  const [signature, setSignature] = useState<string | null>(null);
  const [officerName, setOfficerName] = useState<string>('');

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
    // We go from 0 to arrearsCount
    for (let m = 0; m <= arrearsCount; m++) {
      const monthLabel = getMonthLabel(baseDate, m);
      const litres = litresMap[m] || 0;
      const levy = litres * price;
      
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

      const penalty = levy * penaltyRate;
      const amount = Math.round(levy + penalty);
      // CF fee is only added if litres have been entered
      const total = litres > 0 ? amount + cf : 0;

      result.push({
        m,
        month: monthLabel,
        litres,
        levy,
        penalty,
        penaltyRate,
        compoundingFactor,
        amount,
        total
      });
    }
    return result;
  }, [baseDate, arrearsCount, price, cf, litresMap]);

  const totals = useMemo(() => {
    return rows.reduce((acc, row) => ({
      levy: acc.levy + row.levy,
      penalty: acc.penalty + row.penalty,
      amount: acc.amount + row.amount,
      total: acc.total + row.total,
      litres: acc.litres + row.litres
    }), { levy: 0, penalty: 0, amount: 0, total: 0, litres: 0 });
  }, [rows]);

  const updateLitres = (m: number, val: number) => {
    setLitresMap(prev => ({ ...prev, [m]: val }));
  };

  const chartData = [
    { name: 'Levy', value: totals.levy, color: '#3b82f6' },
    { name: 'Penalty', value: totals.penalty, color: '#ef4444' },
    { name: 'CF Fees', value: rows.filter(r => r.litres > 0).length * cf, color: '#10b981' },
  ];

  const validityDate = useMemo(() => {
    const lastDay = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);
    return lastDay.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  }, []);

  return (
    <div className="min-h-screen p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      {/* Official Print Header (Hidden on Screen) */}
      <div className="hidden print:block text-center space-y-1 mb-8 border-b-2 border-black pb-6">
        <h2 className="text-xl font-bold uppercase">Kenya Dairy Board - Kericho</h2>
        <p className="text-sm">Ardhi House (Huduma Centre) 5th Floor, Wing B.</p>
        <p className="text-sm">Tel: 0717997465 / 0734026367</p>
        <div className="pt-4">
          <h1 className="text-2xl font-black underline decoration-2 underline-offset-4">CONSUMER SAFETY LEVY ESTIMATE</h1>
        </div>
        <div className="flex justify-between pt-6 text-xs font-mono">
          <span>PRICE PER LITRE: Ksh {price.toFixed(2)}</span>
          <span>CF FEE: Ksh {cf.toFixed(2)}</span>
          <span>DATE: {new Date().toLocaleDateString()}</span>
        </div>
      </div>

      {/* Header Section (Hidden on Print) */}
      <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 print:hidden">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="text-blue-500" size={28} />
            <h1 className="text-3xl font-bold tracking-tight">Levy Calculator</h1>
          </div>
          <p className="text-zinc-500 text-sm">Official utility compounding & arrears sequencing</p>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full lg:w-auto">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Start Month</label>
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
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Arrears Count</label>
            <div className="flex items-center gap-2 glass-card px-3 py-2">
              <Layers size={14} className="text-zinc-500" />
              <input 
                type="number" 
                value={arrearsCount} 
                onChange={(e) => setArrearsCount(Math.max(1, parseInt(e.target.value) || 1))}
                className="bg-transparent font-mono text-xs focus:outline-none w-full"
              />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Price</label>
            <div className="flex items-center gap-2 glass-card px-3 py-2">
              <span className="text-zinc-500 text-xs">Ksh</span>
              <input 
                type="number" 
                value={price} 
                onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
                className="bg-transparent font-mono text-xs focus:outline-none w-full"
                step="0.01"
              />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">CF Fee</label>
            <div className="flex items-center gap-2 glass-card px-3 py-2">
              <span className="text-zinc-500 text-xs">Ksh</span>
              <input 
                type="number" 
                value={cf} 
                onChange={(e) => setCf(parseFloat(e.target.value) || 0)}
                className="bg-transparent font-mono text-xs focus:outline-none w-full"
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
                    <th>Levy</th>
                    <th className="print:hidden">Penalty %</th>
                    <th>Penalty (Ksh)</th>
                    <th className="print:hidden">Amount</th>
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
                        className="hover:bg-white/[0.02] transition-colors"
                      >
                        <td className="font-bold text-zinc-400 print:text-black">{row.month}</td>
                        <td className="text-zinc-500 print:text-black">{row.m}</td>
                        <td>
                          <input 
                            type="number" 
                            value={row.litres || ''} 
                            onChange={(e) => updateLitres(row.m, parseFloat(e.target.value) || 0)}
                            placeholder="0"
                            className="bg-transparent w-24 focus:outline-none font-bold text-blue-400 print:text-black"
                          />
                        </td>
                        <td className="text-zinc-400 print:text-black">
                          {row.levy.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="text-zinc-500 text-[10px] print:hidden">
                          {(row.penaltyRate * 100).toFixed(1) + '%'}
                        </td>
                        <td className="text-red-400/80 print:text-black">
                          {row.penalty.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="text-zinc-200 font-bold print:hidden">
                          {row.amount.toLocaleString()}
                        </td>
                        <td className="font-bold text-zinc-100 bg-white/[0.03] print:bg-transparent print:text-black">
                          {row.total.toLocaleString()}
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
                <tfoot>
                  <tr className="bg-white/[0.05] font-bold print:bg-zinc-100">
                    <td colSpan={2} className="text-xs uppercase tracking-widest text-zinc-500 print:text-black">Totals</td>
                    <td className="text-blue-400 print:text-black">{totals.litres.toLocaleString()}</td>
                    <td className="print:text-black">{totals.levy.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td className="print:hidden"></td>
                    <td className="text-red-400 print:text-black">{totals.penalty.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td className="print:hidden"></td>
                    <td className="text-blue-500 text-lg print:text-black print:text-sm">{totals.total.toLocaleString()}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            {/* Validity Date (Hidden on Screen) */}
            <div className="hidden print:block text-right mt-4 px-4">
              <p className="text-xs font-bold italic">This estimate is valid till {validityDate}</p>
            </div>
          </div>

          {/* Logic Breakdown (Hidden on Print) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:hidden">
            <div className="glass-card p-6 space-y-4">
              <div className="flex items-center gap-2 text-zinc-400">
                <Calculator size={18} />
                <h3 className="text-sm font-bold uppercase tracking-widest">Compounding Logic</h3>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-500">Base Penalty (m=1)</span>
                  <span className="font-mono text-blue-400">25.0%</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-500">Compounding Rate</span>
                  <span className="font-mono text-blue-400">12.0% Monthly</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-500">Formula (m &gt; 1)</span>
                  <span className="font-mono text-zinc-300">(1.25 * 1.12^(m-1)) - 1</span>
                </div>
              </div>
            </div>

            <div className="glass-card p-6 space-y-4">
              <div className="flex items-center gap-2 text-zinc-400">
                <AlertCircle size={18} />
                <h3 className="text-sm font-bold uppercase tracking-widest">Sequence Pattern</h3>
              </div>
              <div className="text-[11px] text-zinc-500 leading-relaxed">
                <p>• <span className="text-zinc-300">m=0:</span> Current month, no penalty.</p>
                <p>• <span className="text-zinc-300">m=1:</span> Current month, 25% penalty.</p>
                <p>• <span className="text-zinc-300">m=2+:</span> Previous months, compounded penalty.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Summary */}
        <div className="space-y-6">
          <div className="glass-card p-6 print:hidden">
            <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-500 mb-6">Cost Distribution</h3>
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
                    contentStyle={{ backgroundColor: '#141417', border: '1px solid #27272a', borderRadius: '8px' }}
                    itemStyle={{ color: '#fff' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-3 mt-4">
              {chartData.map((item) => (
                <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-xs text-zinc-400">{item.name}</span>
                  </div>
                  <span className="text-xs font-mono">{item.value.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-card p-4 bg-blue-500/5 border-blue-500/20 print:bg-zinc-50 print:border-zinc-200 print:mt-0">
            <div className="flex justify-between items-start mb-2 print:hidden">
              <div className="p-1.5 bg-blue-500/10 rounded-lg text-blue-500">
                <FileText size={18} />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-blue-500/50">Final Invoice</span>
            </div>
            <div className="space-y-0.5">
              <p className="text-zinc-500 text-[10px] uppercase tracking-widest print:text-black">Grand Total Due (Ksh)</p>
              <p className="text-3xl font-bold tracking-tighter text-white print:text-black print:text-xl">
                {totals.total.toLocaleString()}
              </p>
            </div>

            <div className="mt-6 space-y-4 print:hidden">
              <div className="space-y-2">
                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Signing Officer Name</label>
                <div className="flex items-center gap-2 glass-card px-3 py-2">
                  <User size={14} className="text-zinc-500" />
                  <input 
                    type="text" 
                    value={officerName} 
                    onChange={(e) => setOfficerName(e.target.value)}
                    placeholder="Enter Officer Name"
                    className="bg-transparent font-mono text-xs focus:outline-none w-full text-white"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Authorized Signature</label>
                <div className="relative group">
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={handleSignatureUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div className="flex items-center justify-center gap-2 py-3 border-2 border-dashed border-zinc-800 rounded-xl group-hover:border-blue-500/50 transition-colors bg-white/[0.02]">
                  {signature ? (
                    <div className="flex items-center gap-2">
                      <ImageIcon size={16} className="text-emerald-500" />
                      <span className="text-xs text-emerald-500 font-medium">Signature Loaded</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-zinc-500">
                      <Upload size={16} />
                      <span className="text-xs">Upload Signature</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

            <button 
              onClick={() => window.print()}
              className="w-full mt-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 print:hidden"
            >
              <Download size={18} />
              Export PDF / Print
            </button>
          </div>
        </div>
      </div>

      {/* Official Print Footer (Hidden on Screen) */}
      <div className="hidden print:block pt-8 border-t border-zinc-200 mt-8">
        <p className="text-sm italic leading-relaxed text-zinc-700">
          Levy is due before the 10th of every month and is payable immediately upon submission, as stipulated by the Dairy Industry Act (Cap 336) and its subsidiary regulations.
        </p>
        <div className="mt-12 flex justify-between items-end">
          <div className="space-y-1">
            {signature && (
              <div className="mb-2 ml-4">
                <img src={signature} alt="Signature" className="h-12 object-contain" />
              </div>
            )}
            {officerName && (
              <p className="text-sm font-bold uppercase border-b border-black pb-1 mb-1">{officerName}</p>
            )}
            <p className="text-[10px] uppercase font-bold tracking-widest">Authorized Signature</p>
          </div>
          <div className="text-right">
          </div>
        </div>
      </div>
    </div>
  );
}
