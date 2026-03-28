import React, { useState, useEffect, useMemo } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { withTimeout } from '../lib/supabaseQuery';
import { useAuth } from '../contexts/AuthContext';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell,
  LineChart, Line, AreaChart, Area
} from 'recharts';
import { 
  TrendingUp, TrendingDown, Users, FileBarChart, Filter, Activity, Waves, Crown, ArrowUpRight, ArrowDownRight, CheckCircle2, ChevronLeft, ChevronRight, Receipt, ShieldAlert
} from 'lucide-react';
import { startOfDay, endOfDay, startOfMonth, endOfMonth, startOfYear, endOfYear, subDays, subMonths, format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Transaction {
  id: number;
  type: 'income' | 'expense';
  description: string;
  amount: string;
  category: string;
  date: string;
}

interface WashService {
  id: number;
  service_name: string;
  is_new_client: boolean;
  created_at: string;
  price?: string;
}

interface InventoryHistory {
  id: number;
  product_id: number;
  quantity_before: number;
  quantity_after: number;
  inventory?: { name: string };
}

interface Client {
  id: number;
  created_at: string;
}

const parseAmount = (amountStr: string | number) => {
  if (typeof amountStr === 'number') return amountStr;
  if (!amountStr) return 0;
  let str = amountStr.replace('R$', '').trim();
  if (str.includes(',')) {
    str = str.replace(/\./g, '').replace(',', '.');
  }
  return parseFloat(str) || 0;
};

const formatCurrency = (value: number) => {
  return `R$ ${value.toFixed(2).replace('.', ',')}`;
};

const CustomXAxisTick = (props: any) => {
  const { x, y, payload, data } = props;
  const item = data?.find((d: any) => d.name === payload.value);
  const dayStr = item?.dayOfWeek;
  
  return (
    <g transform={`translate(${x},${y})`}>
      <text x={0} y={0} dy={16} textAnchor="middle" fill="#64748b" fontSize={12} fontWeight={500}>{payload.value}</text>
      {dayStr && (
        <text x={0} y={0} dy={30} textAnchor="middle" fill="#94a3b8" fontSize={10} fontWeight={600} style={{ textTransform: 'capitalize' }}>{dayStr}</text>
      )}
    </g>
  );
};

export default function Relatorios() {
  const { role, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);

  if (!authLoading && role && role !== 'admin') {
    return <Navigate to="/fila" replace />;
  }
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  // Date Filter State
  const [filterType, setFilterType] = useState<'today' | 'yesterday' | 'this_month' | 'last_month' | 'this_year' | 'custom'>('this_month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  
  // Data State
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [washQueue, setWashQueue] = useState<WashService[]>([]);
  const [inventorySales, setInventorySales] = useState<InventoryHistory[]>([]);
  const [newClients, setNewClients] = useState<Client[]>([]);

  const fetchReportData = async () => {
    setLoading(true);
    const now = new Date();
    let startDate: Date;
    let endDate: Date = endOfDay(now);

    switch (filterType) {
      case 'today':
        startDate = startOfDay(now);
        break;
      case 'yesterday':
        startDate = startOfDay(subDays(now, 1));
        endDate = endOfDay(subDays(now, 1));
        break;
      case 'this_month':
        startDate = startOfMonth(now);
        break;
      case 'last_month':
        startDate = startOfMonth(subMonths(now, 1));
        endDate = endOfMonth(subMonths(now, 1));
        break;
      case 'this_year':
        startDate = startOfYear(now);
        break;
      case 'custom':
        if (!customStart || !customEnd) {
          setLoading(false);
          return;
        }
        startDate = startOfDay(new Date(customStart + 'T12:00:00Z'));
        endDate = endOfDay(new Date(customEnd + 'T12:00:00Z'));
        break;
      default:
        startDate = startOfMonth(now);
    }

    const startIso = startDate.toISOString();
    const endIso = endDate.toISOString();
    const startDateOnly = format(startDate, 'yyyy-MM-dd');
    const endDateOnly = format(endDate, 'yyyy-MM-dd');

    try {
      const [txRes, wqRes, invRes, clientsRes] = await Promise.all([
        withTimeout(
          supabase.from('transactions')
            .select('*')
            .gte('date', startDateOnly)
            .lte('date', endDateOnly)
        ),
        
        withTimeout(
          supabase.from('wash_queue')
            .select('id, service_name, is_new_client, created_at, price')
            .eq('status', 'finished')
            .gte('created_at', startIso)
            .lte('created_at', endIso)
        ),

        withTimeout(
          supabase.from('inventory_history')
            .select('id, product_id, quantity_before, quantity_after, inventory(name)')
            .eq('change_type', 'sale')
            .gte('created_at', startIso)
            .lte('created_at', endIso)
        ),

        withTimeout(
          supabase.from('clients')
            .select('id, created_at')
            .gte('created_at', startIso)
            .lte('created_at', endIso)
        )
      ]);

      if (txRes.error) throw txRes.error;
      if (wqRes.error) throw wqRes.error;
      if (invRes.error) throw invRes.error;
      if (clientsRes.error) throw clientsRes.error;

      setTransactions(txRes.data as Transaction[] || []);
      setWashQueue(wqRes.data as WashService[] || []);
      setInventorySales(invRes.data as any[] || []);
      setNewClients(clientsRes.data as Client[] || []);
    } catch (err) {
      console.error('Error fetching report data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (filterType !== 'custom' || (customStart && customEnd)) {
      fetchReportData();
      setCurrentPage(1);
    }
  }, [filterType, customStart, customEnd]);

  // KPIs
  const totalIncome = useMemo(() => transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + parseAmount(t.amount), 0), [transactions]);
  const totalExpense = useMemo(() => transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + parseAmount(t.amount), 0), [transactions]);
  const netProfit = totalIncome - totalExpense;
  const newClientsCount = newClients.length;

  // Process data for charts
  const groupedData = useMemo(() => {
    if (transactions.length === 0) return [];

    const dataMap: { [key: string]: { name: string, dayOfWeek?: string, receita: number, despesa: number, lucro: number } } = {};
    
    // Sort transactions by date
    const sortedTxs = [...transactions].sort((a, b) => a.date.localeCompare(b.date));

    // Determine grouping format: 'dd/MM' for days, 'MMM' for months
    const isLongRange = filterType === 'this_year' || (filterType === 'custom' && transactions.length > 0 && 
       new Date(transactions[transactions.length-1].date).getTime() - new Date(transactions[0].date).getTime() > 60 * 24 * 60 * 60 * 1000);

    sortedTxs.forEach(tx => {
      const date = new Date(tx.date + 'T12:00:00Z');
      const key = isLongRange ? format(date, 'MMM/yy', { locale: ptBR }) : format(date, 'dd/MM', { locale: ptBR });
      const dayName = isLongRange ? '' : format(date, 'eee', { locale: ptBR }).replace('.', '').substring(0, 3);
      
      if (!dataMap[key]) {
        dataMap[key] = { name: key, dayOfWeek: dayName, receita: 0, despesa: 0, lucro: 0 };
      }
      
      const amount = parseAmount(tx.amount);
      if (tx.type === 'income') {
        dataMap[key].receita += amount;
      } else {
        dataMap[key].despesa += amount;
      }
      dataMap[key].lucro = dataMap[key].receita - dataMap[key].despesa;
    });

    return Object.values(dataMap);
  }, [transactions, filterType]);

  // Process wash queue data into services per day
  const servicesPerDay = useMemo(() => {
    if (washQueue.length === 0) return [];
    const dataMap: { [key: string]: { name: string; dayOfWeek?: string; servicos: number } } = {};

    const isLongRange = filterType === 'this_year' || filterType === 'last_month';

    [...washQueue]
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .forEach(ws => {
        const date = new Date(ws.created_at);
        const key = isLongRange
          ? format(date, 'MMM/yy', { locale: ptBR })
          : format(date, 'dd/MM', { locale: ptBR });
        const dayName = isLongRange ? '' : format(date, 'eee', { locale: ptBR }).replace('.', '').substring(0, 3);
        if (!dataMap[key]) dataMap[key] = { name: key, dayOfWeek: dayName, servicos: 0 };
        dataMap[key].servicos++;
      });

    return Object.values(dataMap);
  }, [washQueue, filterType]);

  // Rankings
  const expenseRanking = useMemo(() => {
    const expenses = transactions.filter(t => t.type === 'expense');
    const total = expenses.reduce((acc, t) => acc + parseAmount(t.amount), 0);
    const map: { [cat: string]: { category: string; count: number; value: number } } = {};
    expenses.forEach(t => {
      const cat = t.category || 'Outros';
      if (!map[cat]) map[cat] = { category: cat, count: 0, value: 0 };
      map[cat].count++;
      map[cat].value += parseAmount(t.amount);
    });
    return Object.values(map)
      .sort((a, b) => b.value - a.value)
      .map(item => ({ ...item, percent: total > 0 ? (item.value / total) * 100 : 0 }));
  }, [transactions]);

  const incomeRanking = useMemo(() => {
    const incomes = transactions.filter(t => t.type === 'income');
    const total = incomes.reduce((acc, t) => acc + parseAmount(t.amount), 0);
    const map: { [cat: string]: { category: string; count: number; value: number } } = {};
    incomes.forEach(t => {
      const cat = t.category || 'Outros';
      if (!map[cat]) map[cat] = { category: cat, count: 0, value: 0 };
      map[cat].count++;
      map[cat].value += parseAmount(t.amount);
    });
    return Object.values(map)
      .sort((a, b) => b.value - a.value)
      .map(item => ({ ...item, percent: total > 0 ? (item.value / total) * 100 : 0 }));
  }, [transactions]);

  const sortedTransactions = useMemo(() => {
    return [...transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions]);

  const serviceRanking = useMemo(() => {
    const totalCount = washQueue.length;
    const map: { [svc: string]: { category: string; count: number; value: number } } = {};
    washQueue.forEach(ws => {
      const svc = ws.service_name || 'Outros';
      if (!map[svc]) map[svc] = { category: svc, count: 0, value: 0 };
      map[svc].count++;
      if (ws.price) {
        map[svc].value += parseAmount(ws.price);
      }
    });
    return Object.values(map)
      .sort((a, b) => b.count - a.count)
      .map(item => ({ ...item, percent: totalCount > 0 ? (item.count / totalCount) * 100 : 0 }));
  }, [washQueue]);

  const ServiceTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700 p-4 rounded-xl shadow-2xl">
          <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">{label}</p>
          <div className="flex items-center justify-between gap-8">
            <span className="flex items-center text-sm font-medium text-blue-400">
              <span className="w-2 h-2 rounded-full mr-2 bg-blue-400"></span>
              Serviços
            </span>
            <span className="text-lg font-black text-white">{payload[0].value}</span>
          </div>
        </div>
      );
    }
    return null;
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700 p-4 rounded-xl shadow-2xl">
          <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">{label}</p>
          <div className="space-y-1.5">
            {payload.map((entry: any, index: number) => (
              <div key={index} className="flex items-center justify-between gap-8">
                <span className="flex items-center text-sm font-medium" style={{ color: entry.color }}>
                  <span className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: entry.color }}></span>
                  {entry.name}
                </span>
                <span className="text-sm font-bold text-white">
                  {formatCurrency(entry.value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };


  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      
      {/* Header & Fixed Filters */}
      <div className="flex flex-col xl:flex-row justify-between xl:items-center gap-6 bg-white/40 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white/50 shadow-[0_20px_50px_rgba(0,0,0,0.04)] relative z-20 overflow-hidden">
        {/* Subtle background decoration */}
        <div className="absolute top-0 right-0 -z-10 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30">
              <FileBarChart className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center">
                Insights Analíticos
              </h1>
              <div className="h-1 w-12 bg-blue-600 rounded-full mt-1" />
            </div>
          </div>
          <p className="text-slate-500 text-sm font-medium ml-[60px]">Análise profissional do desempenho do seu negócio.</p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-3 bg-white/60 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white shadow-sm hover:shadow-md hover:border-blue-200 transition-all duration-300">
            <Filter className="w-4 h-4 text-blue-600" />
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Período</span>
              <select 
                value={filterType} 
                onChange={(e) => setFilterType(e.target.value as any)}
                className="bg-transparent text-sm font-bold text-slate-900 outline-none pr-4 cursor-pointer appearance-none"
              >
                <option value="today">Hoje</option>
                <option value="yesterday">Ontem</option>
                <option value="this_month">Este Mês</option>
                <option value="last_month">Mês Passado</option>
                <option value="this_year">Este Ano</option>
                <option value="custom">Personalizado</option>
              </select>
            </div>
          </div>

          {filterType === 'custom' && (
            <div className="flex items-center gap-3 bg-white/60 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white shadow-sm animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Início</span>
                <input 
                  type="date" 
                  value={customStart} 
                  onChange={e => setCustomStart(e.target.value)}
                  className="bg-transparent text-sm font-bold text-slate-900 outline-none cursor-pointer"
                />
              </div>
              <div className="w-px h-6 bg-slate-200" />
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Fim</span>
                <input 
                  type="date" 
                  value={customEnd} 
                  onChange={e => setCustomEnd(e.target.value)}
                  className="bg-transparent text-sm font-bold text-slate-900 outline-none cursor-pointer"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-32">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="group relative bg-white p-6 rounded-[2rem] border border-slate-200/60 shadow-[0_10px_40px_-15px_rgba(0,0,0,0.04)] hover:shadow-[0_20px_50px_-12px_rgba(37,99,235,0.12)] transition-all duration-500 overflow-hidden">
              <div className="absolute -top-6 -right-6 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl group-hover:bg-blue-500/10 transition-colors duration-500" />
              <div className="relative z-10 flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 shadow-sm border border-blue-100 group-hover:scale-110 transition-transform duration-500">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <div className="text-[10px] font-black text-blue-600/40 uppercase tracking-[0.2em]">Faturamento</div>
              </div>
              <div className="relative z-10">
                <div className="flex items-baseline gap-1">
                  <span className="text-sm font-bold text-slate-400">R$</span>
                  <h2 className={`text-3xl font-black tracking-tight text-slate-900 group-hover:text-blue-600 transition-colors duration-500 ${role !== 'admin' ? 'blur-finance' : ''}`}>
                    {totalIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </h2>
                </div>
                <div className="mt-2 flex items-center text-[10px] font-bold text-emerald-500 uppercase tracking-wider">
                  <ArrowUpRight className="w-3 h-3 mr-1" /> Crescimento Real
                </div>
              </div>
            </div>
            
            <div className="group relative bg-white p-6 rounded-[2rem] border border-slate-200/60 shadow-[0_10px_40px_-15px_rgba(0,0,0,0.04)] hover:shadow-[0_20px_50px_-12px_rgba(239,68,68,0.12)] transition-all duration-500 overflow-hidden">
              <div className="absolute -top-6 -right-6 w-32 h-32 bg-red-500/5 rounded-full blur-3xl group-hover:bg-red-500/10 transition-colors duration-500" />
              <div className="relative z-10 flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center text-red-600 shadow-sm border border-red-100 group-hover:scale-110 transition-transform duration-500">
                  <TrendingDown className="w-6 h-6" />
                </div>
                <div className="text-[10px] font-black text-red-600/40 uppercase tracking-[0.2em]">Despesas</div>
              </div>
              <div className="relative z-10">
                <div className="flex items-baseline gap-1">
                  <span className="text-sm font-bold text-slate-400">R$</span>
                  <h2 className={`text-3xl font-black tracking-tight text-slate-900 group-hover:text-red-600 transition-colors duration-500 ${role !== 'admin' ? 'blur-finance' : ''}`}>
                    {totalExpense.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </h2>
                </div>
                <div className="mt-2 flex items-center text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Fluxo de Saída
                </div>
              </div>
            </div>

            <div className={`group relative p-6 rounded-[2rem] border shadow-2xl transition-all duration-500 overflow-hidden ${
              netProfit >= 0 
                ? 'bg-slate-900 border-slate-800 shadow-emerald-500/20 hover:shadow-emerald-500/40' 
                : 'bg-slate-900 border-slate-800 shadow-red-500/20 hover:shadow-red-500/40'
            }`}>
              <div className={`absolute -top-6 -right-6 w-32 h-32 rounded-full blur-3xl transition-colors duration-500 ${
                netProfit >= 0 ? 'bg-emerald-500/10 group-hover:bg-emerald-500/20' : 'bg-red-500/10 group-hover:bg-red-500/20'
              }`} />
              <div className="relative z-10 flex items-center justify-between mb-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg border group-hover:scale-110 transition-transform duration-500 ${
                  netProfit >= 0 ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-red-500/20 text-red-400 border-red-500/30'
                }`}>
                  {netProfit >= 0 ? <TrendingUp className="w-6 h-6" /> : <TrendingDown className="w-6 h-6" />}
                </div>
                <div className={`text-[10px] font-black uppercase tracking-[0.2em] ${
                  netProfit >= 0 ? 'text-emerald-400/50' : 'text-red-400/50'
                }`}>Lucro Líquido</div>
              </div>
              <div className="relative z-10">
                <div className="flex items-baseline gap-1">
                  <span className={`text-sm font-bold ${netProfit >= 0 ? 'text-emerald-500/60' : 'text-red-500/60'}`}>R$</span>
                  <h2 className={`text-3xl font-black tracking-tighter text-white ${role !== 'admin' ? 'blur-finance' : ''}`}>
                    {netProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </h2>
                </div>
                <div className={`mt-2 flex items-center text-[10px] font-black uppercase tracking-wider ${
                  netProfit >= 0 ? 'text-emerald-400' : 'text-red-400'
                }`}>
                  {netProfit >= 0 ? 'Saldo Positivo' : 'Saldo Negativo'}
                </div>
              </div>
            </div>

            <div className="group relative bg-white p-6 rounded-[2rem] border border-slate-200/60 shadow-[0_10px_40px_-15px_rgba(0,0,0,0.04)] hover:shadow-[0_20px_50px_-12px_rgba(147,51,234,0.12)] transition-all duration-500 overflow-hidden">
              <div className="absolute -top-6 -right-6 w-32 h-32 bg-purple-500/5 rounded-full blur-3xl group-hover:bg-purple-500/10 transition-colors duration-500" />
              <div className="relative z-10 flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-600 shadow-sm border border-purple-100 group-hover:scale-110 transition-transform duration-500">
                  <Users className="w-6 h-6" />
                </div>
                <div className="text-[10px] font-black text-purple-600/40 uppercase tracking-[0.2em]">Expansão</div>
              </div>
              <div className="relative z-10">
                <div className="flex items-baseline gap-1">
                  <h2 className="text-3xl font-black tracking-tight text-slate-900 group-hover:text-purple-600 transition-colors duration-500">
                    +{newClientsCount}
                  </h2>
                  <span className="text-xs font-bold text-slate-400 uppercase ml-1">Novos</span>
                </div>
                <div className="mt-2 flex items-center text-[10px] font-bold text-purple-500 uppercase tracking-wider">
                  Novos Clientes
                </div>
              </div>
            </div>
          </div>


          {/* Chart Section */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center">
                  <Activity className="w-5 h-5 mr-2 text-blue-600" /> Desempenho Financeiro
                </h3>
                <p className="text-slate-500 text-xs mt-0.5">Comparativo de receitas e despesas por período.</p>
              </div>
            </div>

            <div className={`h-[280px] w-full ${role !== 'admin' ? 'blur-finance grayscale' : ''}`}>
              {groupedData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={groupedData} margin={{ top: 10, right: 10, left: -20, bottom: 15 }}>
                    <defs>
                      <linearGradient id="colorReceita" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorDespesa" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={<CustomXAxisTick data={groupedData} />}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#64748b', fontSize: 10 }}
                      tickFormatter={(value) => role === 'admin' ? `R$${value >= 1000 ? (value/1000).toFixed(1) + 'k' : value}` : '***'}
                    />
                    <Tooltip content={role === 'admin' ? <CustomTooltip /> : <></>} cursor={{ stroke: '#f1f5f9', strokeWidth: 2 }} />
                    <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ paddingBottom: 20, fontSize: 12, fontWeight: 600 }} />
                    <Area 
                      type="monotone"
                      name="Receita" 
                      dataKey="receita" 
                      stroke="#2563eb"
                      strokeWidth={3}
                      fill="url(#colorReceita)" 
                      animationDuration={1500}
                    />
                    <Area 
                      type="monotone"
                      name="Despesa" 
                      dataKey="despesa" 
                      stroke="#ef4444"
                      strokeWidth={3}
                      fill="url(#colorDespesa)" 
                      animationDuration={1500}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-400">
                  <TrendingUp className="w-12 h-12 mb-3 opacity-20" />
                  <p className="text-sm font-medium">Dados insuficientes para gerar o gráfico</p>
                </div>
              )}
            </div>
            {role !== 'admin' && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/10 backdrop-blur-[2px] rounded-2xl">
                <div className="bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-xl flex items-center">
                  <ShieldAlert className="w-4 h-4 mr-2 text-amber-400" />
                  Visualização restrita a administradores
                </div>
              </div>
            )}
          </div>


          {/* Rankings Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
            {/* Expense Ranking */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-red-50 to-white">
                <h3 className="text-sm font-bold text-slate-900 flex items-center">
                  <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center mr-3">
                    <TrendingDown className="w-4 h-4 text-red-600" />
                  </div>
                  Maiores Despesas
                </h3>
              </div>
              <div className="divide-y divide-slate-50">
                {expenseRanking.length > 0 ? expenseRanking.slice(0, 5).map((item, i) => (
                  <div key={item.category} className="px-6 py-3.5 hover:bg-slate-50/80 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2.5">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${
                          i === 0 ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-500'
                        }`}>{i + 1}</span>
                        <span className="text-sm font-semibold text-slate-800 truncate max-w-[120px]">{item.category}</span>
                      </div>
                      <span className="text-xs font-bold text-slate-400">{item.count}x</span>
                    </div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className={`text-sm font-black text-red-600 ${role !== 'admin' ? 'blur-finance' : ''}`}>
                        {formatCurrency(item.value)}
                      </span>
                      <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">{item.percent.toFixed(1)}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-red-400 to-red-500 rounded-full transition-all duration-700" style={{ width: `${item.percent}%` }} />
                    </div>
                  </div>
                )) : (
                  <div className="px-6 py-10 text-center text-slate-400 text-sm">Nenhuma despesa no per&#237;odo</div>
                )}
              </div>
            </div>

            {/* Income Ranking */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-emerald-50 to-white">
                <h3 className="text-sm font-bold text-slate-900 flex items-center">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center mr-3">
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                  </div>
                  Maiores Receitas
                </h3>
              </div>
              <div className="divide-y divide-slate-50">
                {incomeRanking.length > 0 ? incomeRanking.slice(0, 5).map((item, i) => (
                  <div key={item.category} className="px-6 py-3.5 hover:bg-slate-50/80 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2.5">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${
                          i === 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                        }`}>{i + 1}</span>
                        <span className="text-sm font-semibold text-slate-800 truncate max-w-[120px]">{item.category}</span>
                      </div>
                      <span className="text-xs font-bold text-slate-400">{item.count}x</span>
                    </div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className={`text-sm font-black text-emerald-600 ${role !== 'admin' ? 'blur-finance' : ''}`}>
                        {formatCurrency(item.value)}
                      </span>
                      <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">{item.percent.toFixed(1)}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full transition-all duration-700" style={{ width: `${item.percent}%` }} />
                    </div>
                  </div>
                )) : (
                  <div className="px-6 py-10 text-center text-slate-400 text-sm">Nenhuma receita no per&#237;odo</div>
                )}
              </div>
            </div>

            {/* Services Ranking */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-blue-50 to-white">
                <h3 className="text-sm font-bold text-slate-900 flex items-center">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center mr-3">
                    <Crown className="w-4 h-4 text-blue-600" />
                  </div>
                  Maiores Servi&#231;os
                </h3>
              </div>
              <div className="divide-y divide-slate-50">
                {serviceRanking.length > 0 ? serviceRanking.slice(0, 5).map((item, i) => (
                  <div key={item.category} className="px-6 py-3.5 hover:bg-slate-50/80 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2.5">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${
                          i === 0 ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'
                        }`}>{i + 1}</span>
                        <span className="text-sm font-semibold text-slate-800 truncate max-w-[120px]">{item.category}</span>
                      </div>
                      <span className="text-xs font-bold text-slate-400">{item.count}x</span>
                    </div>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-baseline gap-2">
                        <span className="text-sm font-black text-blue-600">{item.count} servi&#231;os</span>
                        {item.value > 0 && <span className="text-xs font-semibold text-slate-400">({formatCurrency(item.value)})</span>}
                      </div>
                      <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">{item.percent.toFixed(1)}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-blue-400 to-blue-500 rounded-full transition-all duration-700" style={{ width: `${item.percent}%` }} />
                    </div>
                  </div>
                )) : (
                  <div className="px-6 py-10 text-center text-slate-400 text-sm">Nenhum servi&#231;o no per&#237;odo</div>
                )}
              </div>
            </div>
          </div>

          {/* Services Per Day Chart */}

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-8">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center">
                  <Waves className="w-5 h-5 mr-2 text-blue-600" /> Serviços por Dia
                </h3>
                <p className="text-slate-500 text-xs mt-0.5">Volume de lavagens finalizadas no período.</p>
              </div>
              {servicesPerDay.length > 0 && (
                <div className="flex items-center gap-4 bg-white/40 backdrop-blur-xl border border-white/50 rounded-2xl px-5 py-2.5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(37,99,235,0.08)] transition-all duration-500 group">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] leading-tight">Total Geral</span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-2xl font-black text-blue-600 tracking-tighter group-hover:scale-110 transition-transform duration-500">{washQueue.length}</span>
                      <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">Lavagens</span>
                    </div>
                  </div>
                  <div className="w-px h-8 bg-slate-200/60 mx-1" />
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20 transition-transform group-hover:rotate-12">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                </div>
              )}
            </div>

            <div className="h-[280px] w-full">
              {servicesPerDay.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={servicesPerDay} margin={{ top: 10, right: 10, left: -30, bottom: 15 }}>
                    <defs>
                      <linearGradient id="colorServicos" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#2563eb" stopOpacity={0.25}/>
                        <stop offset="100%" stopColor="#2563eb" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      tick={<CustomXAxisTick data={servicesPerDay} />}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#64748b', fontSize: 10 }}
                      allowDecimals={false}
                    />
                    <Tooltip content={<ServiceTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="servicos"
                      name="Serviços"
                      stroke="#2563eb"
                      strokeWidth={3}
                      fill="url(#colorServicos)"
                      dot={{ fill: '#2563eb', strokeWidth: 2, r: 4, stroke: '#fff' }}
                      activeDot={{ r: 6, fill: '#2563eb', stroke: '#fff', strokeWidth: 2 }}
                      animationDuration={1500}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-400">
                  <Waves className="w-12 h-12 mb-3 opacity-20" />
                  <p className="text-sm font-medium">Nenhum serviço finalizado neste período</p>
                </div>
              )}
            </div>
          </div>

          {/* Transactions Table Section */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col mt-6">
            <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50">
              <h2 className="text-lg font-bold text-slate-900 flex items-center">
                <Receipt className="w-5 h-5 mr-2 text-blue-600" /> Transa&#231;&#245;es do Per&#237;odo
              </h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left font-sans">
                <thead className="bg-white text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Descri&#231;&#227;o</th>
                    <th className="px-6 py-4 font-semibold">Categoria</th>
                    <th className="px-6 py-4 font-semibold">Data</th>
                    <th className="px-6 py-4 font-semibold text-center">Status</th>
                    <th className="px-6 py-4 font-semibold text-right">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sortedTransactions.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((transaction) => (
                    <tr key={transaction.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 flex-shrink-0 ${transaction.type === 'income' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                            {transaction.type === 'income' ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-bold text-sm text-slate-900">{transaction.description}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4"><span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">{transaction.category}</span></td>
                      <td className="px-6 py-4 text-sm text-slate-500 font-medium whitespace-nowrap">{new Date(transaction.date + 'T12:00:00Z').toLocaleDateString('pt-BR')}</td>
                      <td className="px-6 py-4 text-center">
                        <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-md border border-emerald-200 flex items-center justify-center w-max mx-auto">
                          <CheckCircle2 className="w-3 h-3 mr-1" />Conclu&#237;do
                        </span>
                      </td>
                      <td className={`px-6 py-4 text-right text-sm font-bold whitespace-nowrap ${transaction.type === 'income' ? 'text-emerald-600' : 'text-red-500'} ${role !== 'admin' ? 'blur-finance' : ''}`}>
                        {transaction.type === 'income' ? '+' : '-'} {formatCurrency(parseAmount(transaction.amount))}
                      </td>
                    </tr>
                  ))}
                  {sortedTransactions.length === 0 && (
                    <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-400 text-sm">Nenhuma transa&#231;&#227;o encontrada para este per&#237;odo.</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {sortedTransactions.length > itemsPerPage && (
              <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  P&#225;gina <span className="text-blue-600">{currentPage}</span> de <span className="text-slate-900">{Math.ceil(sortedTransactions.length / itemsPerPage)}</span>
                </p>
                <div className="flex items-center space-x-2">
                  <button 
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className={`p-2 rounded-lg border border-slate-200 transition-all ${currentPage === 1 ? 'text-slate-300 bg-slate-50 cursor-not-allowed' : 'text-slate-600 bg-white hover:bg-slate-50 active:scale-95 shadow-sm'}`}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(sortedTransactions.length / itemsPerPage)))}
                    disabled={currentPage === Math.ceil(sortedTransactions.length / itemsPerPage)}
                    className={`p-2 rounded-lg border border-slate-200 transition-all ${currentPage === Math.ceil(sortedTransactions.length / itemsPerPage) ? 'text-slate-300 bg-slate-50 cursor-not-allowed' : 'text-slate-600 bg-white hover:bg-slate-50 active:scale-95 shadow-sm'}`}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
