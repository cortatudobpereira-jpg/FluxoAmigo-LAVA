import React, { useState, useEffect } from 'react';
import { Plus, ArrowDownRight, ArrowUpRight, Filter, Download, Calendar, Activity, CheckCircle2, ChevronRight, ChevronLeft, TrendingUp, Wallet, Receipt } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { withTimeout } from '../lib/supabaseQuery';
import { useAuth } from '../contexts/AuthContext';

interface Transaction {
  id: number;
  type: 'income' | 'expense';
  description: string;
  amount: string;
  category: string;
  status: 'completed' | 'pending';
  date: string;
  notes?: string;
}

export default function Finance() {
  const { role } = useAuth();
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<'day' | 'week' | 'month'>('day');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const fetchTransactions = async () => {
    setLoading(true);
    const { data } = await withTimeout(
      supabase.from('transactions').select('*').order('date', { ascending: false }).order('created_at', { ascending: false })
    );
    const transactionsData = data || [];
    setAllTransactions(transactionsData);
    applyFilter(transactionsData, filterType);
    setLoading(false);
  };

  const applyFilter = (data: Transaction[], type: 'day' | 'week' | 'month') => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const filtered = data.filter(t => {
      const tDate = new Date(t.date + 'T12:00:00Z');
      tDate.setHours(0, 0, 0, 0);

      if (type === 'day') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return tDate.getTime() === today.getTime();
      } else if (type === 'week') {
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay());
        return tDate >= weekStart;
      } else if (type === 'month') {
        return tDate.getMonth() === now.getMonth() && tDate.getFullYear() === now.getFullYear();
      }
      return true;
    });

    setFilteredTransactions(filtered);
    setCurrentPage(1);
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  useEffect(() => {
    applyFilter(allTransactions, filterType);
  }, [filterType, allTransactions]);

  const parseAmount = (amountStr: string) => {
    return parseFloat(amountStr.replace('R$', '').replace(/\./g, '').replace(',', '.').trim() || '0');
  };

  const totalIncomeValue = filteredTransactions.filter(t => t.type === 'income').reduce((acc, t) => acc + parseAmount(t.amount), 0);
  const totalExpenseValue = filteredTransactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + parseAmount(t.amount), 0);
  const balanceValue = totalIncomeValue - totalExpenseValue;

  const getPeriodLabel = () => {
    if (filterType === 'day') return 'de Hoje';
    if (filterType === 'week') return 'Esta Semana';
    return 'Este Mês';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Fluxo de Caixa</h1>
        </div>
        
        {/* Modern Filter Toggle */}
        <div className="bg-white border border-slate-200 p-1 rounded-xl shadow-sm flex items-center">
          <button 
            onClick={() => setFilterType('day')}
            className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all duration-300 ${filterType === 'day' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
          >
            Dia
          </button>
          <button 
            onClick={() => setFilterType('week')}
            className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all duration-300 ${filterType === 'week' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
          >
            Semana
          </button>
        </div>

        <div className="flex space-x-3 w-full sm:w-auto">
          <Link to="/financeiro/novo" className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm flex items-center justify-center">
            <Plus className="w-4 h-4 mr-2" />Nova Transação
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="group relative bg-white p-6 rounded-[2rem] border border-slate-200/60 shadow-[0_10px_40px_-15px_rgba(0,0,0,0.04)] hover:shadow-[0_20px_50px_-12px_rgba(16,185,129,0.12)] transition-all duration-500 overflow-hidden">
          <div className="absolute -top-6 -right-6 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl group-hover:bg-emerald-500/10 transition-colors duration-500" />
          <div className="relative z-10 flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 shadow-sm border border-emerald-100 group-hover:scale-110 transition-transform duration-500">
              <ArrowUpRight className="w-6 h-6" />
            </div>
            <div className="text-[10px] font-black text-emerald-600/40 uppercase tracking-[0.2em]">Receitas</div>
          </div>
          <div className="relative z-10">
            <div className="flex items-baseline gap-1">
              <span className="text-sm font-bold text-slate-400">R$</span>
              <h2 className={`text-3xl font-black tracking-tight text-slate-900 group-hover:text-emerald-600 transition-colors duration-500 ${role !== 'admin' ? 'blur-finance' : ''}`}>
                {totalIncomeValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h2>
            </div>
            <div className="mt-2 flex items-center text-[10px] font-bold text-emerald-500 uppercase tracking-wider">
              Fluxo de Entrada
            </div>
          </div>
        </div>

        <div className="group relative bg-white p-6 rounded-[2rem] border border-slate-200/60 shadow-[0_10px_40px_-15px_rgba(0,0,0,0.04)] hover:shadow-[0_20px_50px_-12px_rgba(239,68,68,0.12)] transition-all duration-500 overflow-hidden">
          <div className="absolute -top-6 -right-6 w-32 h-32 bg-red-500/5 rounded-full blur-3xl group-hover:bg-red-500/10 transition-colors duration-500" />
          <div className="relative z-10 flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center text-red-600 shadow-sm border border-red-100 group-hover:scale-110 transition-transform duration-500">
              <ArrowDownRight className="w-6 h-6" />
            </div>
            <div className="text-[10px] font-black text-red-600/40 uppercase tracking-[0.2em]">Despesas</div>
          </div>
          <div className="relative z-10">
            <div className="flex items-baseline gap-1">
              <span className="text-sm font-bold text-slate-400">R$</span>
              <h2 className={`text-3xl font-black tracking-tight text-slate-900 group-hover:text-red-600 transition-colors duration-500 ${role !== 'admin' ? 'blur-finance' : ''}`}>
                {totalExpenseValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h2>
            </div>
            <div className="mt-2 flex items-center text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Fluxo de Saída
            </div>
          </div>
        </div>

        <div className={`group relative p-6 rounded-[2rem] border shadow-2xl transition-all duration-500 overflow-hidden ${
          balanceValue >= 0 
            ? 'bg-slate-900 border-slate-800 shadow-emerald-500/20 hover:shadow-emerald-500/40' 
            : 'bg-slate-900 border-slate-800 shadow-red-500/20 hover:shadow-red-500/40'
        }`}>
          <div className={`absolute -top-6 -right-6 w-32 h-32 rounded-full blur-3xl transition-colors duration-500 ${
            balanceValue >= 0 ? 'bg-emerald-500/10 group-hover:bg-emerald-500/20' : 'bg-red-500/10 group-hover:bg-red-500/20'
          }`} />
          <div className="relative z-10 flex items-center justify-between mb-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg border group-hover:scale-110 transition-transform duration-500 ${
              balanceValue >= 0 ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-red-500/20 text-red-400 border-red-500/30'
            }`}>
              <Wallet className="w-6 h-6" />
            </div>
            <div className={`text-[10px] font-black uppercase tracking-[0.2em] ${
              balanceValue >= 0 ? 'text-emerald-400/50' : 'text-red-400/50'
            }`}>Balanço Geral</div>
          </div>
          <div className="relative z-10">
            <div className="flex items-baseline gap-1">
              <span className={`text-sm font-bold ${balanceValue >= 0 ? 'text-emerald-500/60' : 'text-red-500/60'}`}>R$</span>
              <h2 className={`text-3xl font-black tracking-tighter text-white ${role !== 'admin' ? 'blur-finance' : ''}`}>
                {balanceValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h2>
            </div>
            <div className={`mt-2 flex items-center text-[10px] font-black uppercase tracking-wider ${
              balanceValue >= 0 ? 'text-emerald-400' : 'text-red-400'
            }`}>
              {balanceValue >= 0 ? 'Saldo Positivo' : 'Saldo Negativo'}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50">
          <h2 className="text-lg font-bold text-slate-900 flex items-center"><Receipt className="w-5 h-5 mr-2 text-blue-600" />Transações de <span className="ml-1 text-blue-600">{getPeriodLabel()}</span></h2>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <div className="w-6 h-6 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <table className="w-full text-left font-sans">
              <thead className="bg-white text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 font-semibold">Descrição</th>
                  <th className="px-6 py-4 font-semibold">Categoria</th>
                  <th className="px-6 py-4 font-semibold">Data</th>
                  <th className="px-6 py-4 font-semibold text-center">Status</th>
                  <th className="px-6 py-4 font-semibold text-right">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTransactions.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((transaction) => (
                  <tr key={transaction.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 flex-shrink-0 ${transaction.type === 'income' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                          {transaction.type === 'income' ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-sm text-slate-900">{transaction.description}</span>
                          {transaction.notes && (
                            <span className="text-[11px] text-slate-400 font-medium italic truncate max-w-[200px]" title={transaction.notes}>
                              {transaction.notes}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4"><span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">{transaction.category}</span></td>
                    <td className="px-6 py-4 text-sm text-slate-500 font-medium whitespace-nowrap">{new Date(transaction.date + 'T12:00:00Z').toLocaleDateString('pt-BR')}</td>
                    <td className="px-6 py-4 text-center">
                      <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-md border border-emerald-200 flex items-center justify-center w-max mx-auto">
                        <CheckCircle2 className="w-3 h-3 mr-1" />Concluído
                      </span>
                    </td>
                    <td className={`px-6 py-4 text-right text-sm font-bold whitespace-nowrap ${transaction.type === 'income' ? 'text-emerald-600' : 'text-red-500'} ${role !== 'admin' ? 'blur-finance' : ''}`}>
                      {transaction.type === 'income' ? '+' : '-'} R$ {parseAmount(transaction.amount).toFixed(2).replace('.', ',')}
                    </td>
                  </tr>
                ))}
                {filteredTransactions.length === 0 && (
                  <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-400 text-sm">Nenhuma transação encontrada para este período.</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {!loading && filteredTransactions.length > itemsPerPage && (
          <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Página <span className="text-blue-600">{currentPage}</span> de <span className="text-slate-900">{Math.ceil(filteredTransactions.length / itemsPerPage)}</span>
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
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(filteredTransactions.length / itemsPerPage)))}
                disabled={currentPage === Math.ceil(filteredTransactions.length / itemsPerPage)}
                className={`p-2 rounded-lg border border-slate-200 transition-all ${currentPage === Math.ceil(filteredTransactions.length / itemsPerPage) ? 'text-slate-300 bg-slate-50 cursor-not-allowed' : 'text-slate-600 bg-white hover:bg-slate-50 active:scale-95 shadow-sm'}`}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
