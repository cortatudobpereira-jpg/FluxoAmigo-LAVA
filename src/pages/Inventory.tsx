import React, { useState, useEffect } from 'react';
import { Search, Plus, Package, AlertTriangle, ArrowRight, Settings, History, Minus, CheckCircle2, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { withTimeout } from '../lib/supabaseQuery';

interface InventoryItem {
  id: number;
  name: string;
  category: string;
  quantity: number;
  min_quantity: number;
  unit: string;
  price: string;
}

interface InventoryHistory {
  id: number;
  product_name: string;
  change_type: 'adjustment' | 'purchase' | 'sale';
  quantity_before: number;
  quantity_after: number;
  notes: string;
  user_name: string;
  created_at: string;
}

export default function Inventory() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [correctionValue, setCorrectionValue] = useState('');
  const [minQuantityValue, setMinQuantityValue] = useState('');
  const [adjustmentNotes, setAdjustmentNotes] = useState('');
  const [view, setView] = useState<'list' | 'history'>('list');
  const [history, setHistory] = useState<InventoryHistory[]>([]);
  const [savingCorrection, setSavingCorrection] = useState(false);
  
  // Date filters for history
  const [filterDay, setFilterDay] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [filterYear, setFilterYear] = useState('');

  const fetchData = async () => {
    setLoading(true);
    const { data: itemsData } = await withTimeout(
      supabase.from('inventory').select('*').order('name')
    );
    setItems(itemsData || []);

    const { data: historyData } = await withTimeout(
      supabase
        .from('inventory_history')
        .select(`
          *,
          inventory (name)
        `)
        .order('created_at', { ascending: false })
    );
    
    setHistory((historyData || []).map(h => ({
      ...h,
      product_name: h.inventory?.name || 'Produto Removido'
    })));

    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const availableYears = Array.from(new Set(history.map(h => new Date(h.created_at).getFullYear().toString()))).sort((a, b) => Number(b) - Number(a));

  const getStatusBadge = (quantity: number, minQuantity: number) => {
    if (quantity === 0) {
      return <span className="px-2.5 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-md border border-red-200">Sem Estoque</span>;
    }
    if (quantity <= minQuantity) {
      return <span className="px-2.5 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded-md border border-amber-200">Estoque Baixo</span>;
    }
    return <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-md border border-emerald-200">Normal</span>;
  };

  const handleCorrection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem || !correctionValue) return;

    setSavingCorrection(true);
    const newVal = Number(correctionValue);
    const newMin = Number(minQuantityValue);

    const { error: updateError } = await supabase
      .from('inventory')
      .update({ 
        quantity: newVal,
        min_quantity: newMin
      })
      .eq('id', selectedItem.id);

    if (!updateError) {
      if (selectedItem.quantity !== newVal) {
        const { data: { user } } = await supabase.auth.getUser();
        // Log History só se a quantidade atual mudou
        await supabase.from('inventory_history').insert({
          user_id: user?.id,
          user_name: user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Usuário',
          product_id: selectedItem.id,
          change_type: 'adjustment',
          quantity_before: selectedItem.quantity,
          quantity_after: newVal,
          notes: adjustmentNotes || 'Ajuste manual de estoque'
        });
      }

      await fetchData();
      setShowCorrectionModal(false);
      setSelectedItem(null);
      setCorrectionValue('');
      setAdjustmentNotes('');
    }
    setSavingCorrection(false);
  };

  const openCorrectionModal = (item: InventoryItem) => {
    setSelectedItem(item);
    setCorrectionValue(item.quantity.toString());
    setMinQuantityValue(item.min_quantity.toString());
    setShowCorrectionModal(true);
  };

  const itemsAlertCount = items.filter(item => item.quantity <= item.min_quantity && item.quantity > 0).length;
  const itemsEmptyCount = items.filter(item => item.quantity === 0).length;

  if (loading && items.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Estoque de Produtos</h1>
          <p className="text-slate-500 text-sm">Controle os produtos químicos e materiais através do fluxo de caixa.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="group relative bg-white p-6 rounded-[2rem] border border-slate-200/60 shadow-[0_10px_40px_-15px_rgba(0,0,0,0.04)] hover:shadow-[0_20px_50px_-12px_rgba(37,99,235,0.12)] transition-all duration-500 overflow-hidden">
          <div className="absolute -top-6 -right-6 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl group-hover:bg-blue-500/10 transition-colors duration-500" />
          <div className="relative z-10 flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 shadow-sm border border-blue-100 group-hover:scale-110 transition-transform duration-500">
              <Package className="w-6 h-6" />
            </div>
            <div className="text-[10px] font-black text-blue-600/40 uppercase tracking-[0.2em]">Total de Itens</div>
          </div>
          <div className="relative z-10">
            <div className="flex items-baseline gap-1">
              <h2 className="text-3xl font-black tracking-tight text-slate-900 group-hover:text-blue-600 transition-colors duration-500">
                {items.length}
              </h2>
              <span className="text-xs font-bold text-slate-400 uppercase ml-1">Produtos</span>
            </div>
            <div className="mt-2 flex items-center text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Estoque Geral
            </div>
          </div>
        </div>

        <div className="group relative bg-white p-6 rounded-[2rem] border border-slate-200/60 shadow-[0_10px_40px_-15px_rgba(0,0,0,0.04)] hover:shadow-[0_20px_50px_-12px_rgba(245,158,11,0.12)] transition-all duration-500 overflow-hidden">
          <div className="absolute -top-6 -right-6 w-32 h-32 bg-amber-500/5 rounded-full blur-3xl group-hover:bg-amber-500/10 transition-colors duration-500" />
          <div className="relative z-10 flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600 shadow-sm border border-amber-100 group-hover:scale-110 transition-transform duration-500">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="text-[10px] font-black text-amber-600/40 uppercase tracking-[0.2em]">Estoque Baixo</div>
          </div>
          <div className="relative z-10">
            <div className="flex items-baseline gap-1">
              <h2 className="text-3xl font-black tracking-tight text-slate-900 group-hover:text-amber-600 transition-colors duration-500">
                {itemsAlertCount}
              </h2>
              <span className="text-xs font-bold text-slate-400 uppercase ml-1">Unidades</span>
            </div>
            <div className="mt-2 flex items-center text-[10px] font-bold text-amber-500 uppercase tracking-wider">
              Atenção Necessária
            </div>
          </div>
        </div>

        <div className="group relative bg-white p-6 rounded-[2rem] border border-slate-200/60 shadow-[0_10px_40px_-15px_rgba(0,0,0,0.04)] hover:shadow-[0_20px_50px_-12px_rgba(239,68,68,0.12)] transition-all duration-500 overflow-hidden">
          <div className="absolute -top-6 -right-6 w-32 h-32 bg-red-500/5 rounded-full blur-3xl group-hover:bg-red-500/10 transition-colors duration-500" />
          <div className="relative z-10 flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center text-red-600 shadow-sm border border-red-100 group-hover:scale-110 transition-transform duration-500">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="text-[10px] font-black text-red-600/40 uppercase tracking-[0.2em]">Sem Estoque</div>
          </div>
          <div className="relative z-10">
            <div className="flex items-baseline gap-1">
              <h2 className="text-3xl font-black tracking-tight text-slate-900 group-hover:text-red-600 transition-colors duration-500">
                {itemsEmptyCount}
              </h2>
              <span className="text-xs font-bold text-slate-400 uppercase ml-1">Esgotados</span>
            </div>
            <div className="mt-2 flex items-center text-[10px] font-bold text-red-500 uppercase tracking-wider">
              Crítico
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-2">
        <button 
          onClick={() => setView('list')} 
          className={`flex-1 flex items-center justify-center space-x-2 px-4 py-2.5 rounded-lg font-bold text-sm transition-all ${view === 'list' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
        >
          <Package className="w-4 h-4" />
          <span>Lista de Itens</span>
        </button>
        <button 
          onClick={() => setView('history')} 
          className={`flex-1 flex items-center justify-center space-x-2 px-4 py-2.5 rounded-lg font-bold text-sm transition-all ${view === 'history' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
        >
          <History className="w-4 h-4" />
          <span>Histórico</span>
        </button>
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center gap-4">
        <div className="relative w-full md:flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input 
            type="text" 
            placeholder={view === 'list' ? "Filtrar por produto..." : "Filtrar por produto ou motivo..."} 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none text-sm transition-all" 
          />
        </div>
        
        {view === 'history' && (
          <div className="w-full md:w-auto flex items-center space-x-2">
            <select
              value={filterDay}
              onChange={(e) => setFilterDay(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 outline-none text-sm bg-white"
            >
              <option value="">Dia</option>
              {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                <option key={d} value={d.toString().padStart(2, '0')}>{d.toString().padStart(2, '0')}</option>
              ))}
            </select>
            <select
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 outline-none text-sm bg-white"
            >
              <option value="">Mês</option>
              {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                <option key={m} value={m.toString().padStart(2, '0')}>{m.toString().padStart(2, '0')}</option>
              ))}
            </select>
            <select
              value={filterYear}
              onChange={(e) => setFilterYear(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 outline-none text-sm bg-white"
            >
              <option value="">Ano</option>
              {availableYears.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {view === 'list' ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left font-sans">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 font-semibold">Produto</th>
                  <th className="px-6 py-4 font-semibold">Categoria</th>
                  <th className="px-6 py-4 font-semibold text-center">Quantidade</th>
                  <th className="px-6 py-4 font-semibold text-center">Status</th>
                  <th className="px-6 py-4 font-semibold text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center mr-3 text-blue-600"><Package className="w-5 h-5" /></div>
                        <span className="font-bold text-sm text-slate-900">{item.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4"><span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">{item.category}</span></td>
                    <td className="px-6 py-4 text-center">
                      <span className="font-mono font-bold text-slate-900">{item.quantity} <span className="text-xs text-slate-500 font-sans ml-1">{item.unit}</span></span>
                    </td>
                    <td className="px-6 py-4 text-center">{getStatusBadge(item.quantity, item.min_quantity)}</td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => openCorrectionModal(item)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-200" title="Ajuste de Estoque"><Settings className="w-4 h-4" /></button>
                    </td>
                  </tr>
                ))}
                {filteredItems.length === 0 && items.length > 0 && (
                  <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-400 text-sm">Nenhum produto encontrado na busca.</td></tr>
                )}
                {items.length === 0 && (
                  <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-400 text-sm">Nenhum produto cadastrado no estoque.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left font-sans">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 font-semibold uppercase">Data</th>
                  <th className="px-6 py-4 font-semibold uppercase">Usuário</th>
                  <th className="px-6 py-4 font-semibold uppercase">Produto</th>
                  <th className="px-6 py-4 font-semibold uppercase text-center">Tipo</th>
                  <th className="px-6 py-4 font-semibold uppercase text-center">Ajuste</th>
                  <th className="px-6 py-4 font-semibold uppercase">Motivo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {history
                  .filter(h => {
                    // Text search
                    const matchText = h.product_name.toLowerCase().includes(searchTerm.toLowerCase()) || h.notes.toLowerCase().includes(searchTerm.toLowerCase());
                    if (!matchText) return false;

                    // Date filters
                    if (!filterDay && !filterMonth && !filterYear) return true; // General

                    const dateObj = new Date(h.created_at);
                    const dDay = dateObj.getDate().toString().padStart(2, '0');
                    const dMonth = (dateObj.getMonth() + 1).toString().padStart(2, '0');
                    const dYear = dateObj.getFullYear().toString();

                    if (filterDay && filterDay !== dDay) return false;
                    if (filterMonth && filterMonth !== dMonth) return false;
                    if (filterYear && filterYear !== dYear) return false;

                    return true;
                  })
                  .map((log) => {
                    const diff = log.quantity_after - log.quantity_before;
                    const isPositive = diff > 0;
                    return (
                      <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-6 py-4 text-xs font-medium text-slate-500">
                          {new Date(log.created_at).toLocaleString('pt-BR')}
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 capitalize">{log.user_name}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-bold text-sm text-slate-900">{log.product_name}</span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase border ${
                            log.change_type === 'purchase' ? 'bg-blue-50 text-blue-600 border-blue-100' : 
                            log.change_type === 'sale' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                            'bg-slate-100 text-slate-600 border-slate-200'
                          }`}>
                            {log.change_type === 'purchase' ? 'Compra' : log.change_type === 'sale' ? 'Venda' : 'Ajuste'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center font-mono font-bold">
                          <span className={isPositive ? 'text-emerald-600' : 'text-red-500'}>
                            {isPositive ? '+' : ''}{diff}
                          </span>
                          <ArrowRight className="inline w-3 h-3 mx-2 text-slate-300" />
                          <span className="text-slate-900">{log.quantity_after}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xs text-slate-500 line-clamp-1 italic">{log.notes}</span>
                        </td>
                      </tr>
                    );
                  })}
                {history.length === 0 && (
                  <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-400 text-sm">Nenhum histórico registrado ainda.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Correction Modal */}
      {showCorrectionModal && selectedItem && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><History className="w-5 h-5" /></div>
                <h3 className="font-bold text-slate-900 uppercase tracking-wider text-sm">Ajustar Estoque Interno</h3>
              </div>
              <button onClick={() => setShowCorrectionModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleCorrection} className="p-6 space-y-4">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase mb-1">Produto</p>
                <p className="font-bold text-slate-900 text-lg">{selectedItem.name}</p>
                <p className="text-sm text-slate-500">{selectedItem.category}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Quantidade Atual ({selectedItem.unit})</label>
                  <input
                    type="number"
                    step="any"
                    value={correctionValue}
                    onChange={(e) => setCorrectionValue(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all font-mono text-xl"
                    placeholder="0.00"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Mínimo Ideal</label>
                  <input
                    type="number"
                    step="any"
                    value={minQuantityValue}
                    onChange={(e) => setMinQuantityValue(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all font-mono text-xl bg-amber-50"
                    placeholder="0"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Motivo do Ajuste (Opcional)</label>
                <input
                  type="text"
                  value={adjustmentNotes}
                  onChange={(e) => setAdjustmentNotes(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all text-sm"
                  placeholder="Ex: Conferência mensal, quebra de frasco..."
                />
              </div>
              <div className="pt-4 flex space-x-3">
                <button type="button" onClick={() => setShowCorrectionModal(false)} className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-lg font-bold hover:bg-slate-50 transition-colors">Cancelar</button>
                <button type="submit" disabled={savingCorrection} className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors shadow-sm flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4 mr-2" />{savingCorrection ? 'Salvando...' : 'Confirmar Ajuste'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
