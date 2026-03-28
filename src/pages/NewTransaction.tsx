import React, { useState, useEffect } from 'react';
import { ArrowLeft, Wallet, Tag, FileText, CheckCircle2, ArrowUpRight, ArrowDownRight, AlignLeft, Hash, Beaker, Package, Pencil, Trash2, X, Save, PlusCircle, MinusCircle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { formatCurrencyInput } from '../utils/format';

const getLocalDateString = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export default function NewTransaction() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [incomeCategories, setIncomeCategories] = useState<any[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<any[]>([]);
  const [showNewCategoryModal, setShowNewCategoryModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editAffectsInventory, setEditAffectsInventory] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatAffectsInventory, setNewCatAffectsInventory] = useState(false);
  const [showNotesField, setShowNotesField] = useState(false);
  const [stockError, setStockError] = useState('');
  const [formData, setFormData] = useState({
    type: 'income',
    description: '',
    amount: '',
    category: '',
    notes: '',
    date: getLocalDateString(),
    productId: '',
    addQuantity: '',
    newProductName: '',
    newProductUnit: 'un',
    movementType: 'add' as 'add' | 'subtract'
  });

  useEffect(() => {
    supabase.from('inventory').select('id, name, unit').order('name').then(({ data }) => {
      setInventoryItems(data || []);
    });
    supabase.from('income_categories').select('id, name, affects_inventory').order('name').then(({ data }) => {
      setIncomeCategories(data || []);
    });
    supabase.from('expense_categories').select('id, name, affects_inventory').order('name').then(({ data }) => {
      setExpenseCategories(data || []);
    });
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const updates = { ...prev, [name]: value };
      
      if (name === 'category' && value === 'new_category') {
        setShowNewCategoryModal(true);
        updates.category = ''; // reset or keep empty until created
        return updates;
      }

      // Smart default for movementType when category changes
      if (name === 'category') {
        const catData = (prev.type === 'income' ? incomeCategories : expenseCategories).find(c => c.name === value);
        if (catData?.affects_inventory) {
          updates.movementType = prev.type === 'income' ? 'subtract' : 'add';
        }
      }

      // Sync movementType if transaction type changes
      if (name === 'type') {
        updates.movementType = value === 'income' ? 'subtract' : 'add';
      }
      
      return updates;
    });
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === 'amount' && value) {
      setFormData(prev => ({ ...prev, [name]: formatCurrencyInput(value) }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStockError('');

    const amountFormatted = formData.amount ? `R$ ${formData.amount}` : 'R$ 0,00';
    const movementType = formData.type === 'income' ? 'subtract' : 'add';

    // Stock validation: prevent negative stock on sales
    if (movementType === 'subtract' && showInventoryFields && formData.addQuantity) {
      const qNeeded = Number(formData.addQuantity);
      
      if (formData.productId === 'new' && formData.newProductName) {
        // A new product has 0 stock, so any sale > 0 is invalid
        if (qNeeded > 0) {
          setStockError(`⚠️ Estoque insuficiente! O novo produto "${formData.newProductName}" possui 0 unidade(s) em estoque. Realize uma compra (Entrada) primeiro.`);
          setLoading(false);
          return;
        }
      } else if (formData.productId) {
        // Existing product: check against database
        const { data: productStock } = await supabase.from('inventory').select('quantity, name').eq('id', formData.productId).single();
        if (productStock && (productStock.quantity || 0) < qNeeded) {
          setStockError(`⚠️ Estoque insuficiente! O produto "${productStock.name}" possui apenas ${productStock.quantity || 0} unidade(s) em estoque.`);
          setLoading(false);
          return;
        }
      }
    }
    
    // 1. Em vez de salvar diretamente, abrimos a confirmação (validações do estoque já garantiram a segurança).
    setLoading(false);
    setShowConfirmModal(true);
  };

  const confirmTransaction = async () => {
    setLoading(true);
    const amountFormatted = formData.amount ? `R$ ${formData.amount}` : 'R$ 0,00';
    const movementType = formData.type === 'income' ? 'subtract' : 'add';

    const { data: transaction, error: transError } = await supabase.from('transactions').insert({
      user_id: user!.id,
      type: formData.type,
      description: formData.description,
      amount: amountFormatted,
      category: formData.category,
      notes: formData.notes,
      date: formData.date,
      status: 'completed'
    }).select().single();

    if (transError) {
      setLoading(false);
      setShowConfirmModal(false);
      alert("Erro ao salvar transação: " + transError.message);
      return;
    }

    if (showInventoryFields && formData.addQuantity && (formData.productId || formData.newProductName)) {
      const qToAdd = Number(formData.addQuantity);
      if (!isNaN(qToAdd) && qToAdd > 0) {
        let targetProductId = formData.productId;
        if (targetProductId === 'new' && formData.newProductName) {
          const { data: newProd, error: prodError } = await supabase.from('inventory').insert({
            user_id: user!.id,
            name: formData.newProductName,
            category: formData.category,
            quantity: movementType === 'add' ? qToAdd : -qToAdd,
            unit: formData.newProductUnit,
            min_quantity: 1,
            price: amountFormatted
          }).select().single();
          
          if (!prodError) {
            targetProductId = newProd.id;
            await supabase.from('inventory_history').insert({
              user_id: user!.id,
              user_name: user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Usuário',
              product_id: targetProductId,
              change_type: movementType === 'add' ? 'purchase' : 'sale',
              quantity_before: 0,
              quantity_after: movementType === 'add' ? qToAdd : -qToAdd,
              notes: `${movementType === 'add' ? 'Compra' : 'Venda'} inicial via financeiro (${formData.description})`
            });
          }
        } else if (targetProductId && targetProductId !== 'new') {
          const { data: item } = await supabase.from('inventory').select('quantity').eq('id', targetProductId).single();
          if (item) {
            const newQty = movementType === 'add' ? (item.quantity || 0) + qToAdd : (item.quantity || 0) - qToAdd;
            await supabase.from('inventory').update({ quantity: newQty }).eq('id', targetProductId);
            await supabase.from('inventory_history').insert({
              user_id: user!.id,
              user_name: user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Usuário',
              product_id: targetProductId,
              change_type: movementType === 'add' ? 'purchase' : 'sale',
              quantity_before: item.quantity,
              quantity_after: newQty,
              notes: `${movementType === 'add' ? 'Compra' : 'Venda'} via financeiro (${formData.description})`
            });
          }
        }
      }
    }
    setLoading(false);
    setShowConfirmModal(false);
    navigate('/financeiro');
  };

  const selectedCategoryData = (formData.type === 'income' ? incomeCategories : expenseCategories).find(c => c.name === formData.category);
  const showInventoryFields = selectedCategoryData?.affects_inventory;

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center space-x-4">
        <Link to="/financeiro" className="p-2 bg-white border border-slate-200 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-colors shadow-sm"><ArrowLeft className="w-5 h-5" /></Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Nova Transação</h1>
          <p className="text-slate-500 text-sm">Registre uma nova entrada ou saída no caixa.</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <form onSubmit={handleSubmit} className="p-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4 md:col-span-2">
              <label className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center">Tipo de Transação</label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, type: 'income', category: '', amount: '', productId: '', addQuantity: '' }))}
                  className={`p-4 rounded-xl border-2 flex items-center justify-center space-x-3 transition-all ${
                    formData.type === 'income' 
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm' 
                      : 'border-slate-200 text-slate-500 hover:border-emerald-200 hover:bg-emerald-50/50'
                  }`}
                >
                  <ArrowUpRight className={`w-5 h-5 ${formData.type === 'income' ? 'text-emerald-600' : 'text-slate-400'}`} />
                  <span className="font-bold">Receita</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, type: 'expense', category: '', amount: '', productId: '', addQuantity: '' }))}
                  className={`p-4 rounded-xl border-2 flex items-center justify-center space-x-3 transition-all ${
                    formData.type === 'expense' 
                      ? 'border-red-500 bg-red-50 text-red-700 shadow-sm' 
                      : 'border-slate-200 text-slate-500 hover:border-red-200 hover:bg-red-50/50'
                  }`}
                >
                  <ArrowDownRight className={`w-5 h-5 ${formData.type === 'expense' ? 'text-red-600' : 'text-slate-400'}`} />
                  <span className="font-bold">Despesa</span>
                </button>
              </div>
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center"><FileText className="w-4 h-4 mr-2 text-blue-600" />Descrição da Transação</label>
              <input type="text" name="description" value={formData.description} onChange={handleInputChange} className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all bg-slate-50 focus:bg-white text-lg font-bold" required />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center"><Wallet className={`w-4 h-4 mr-2 ${formData.type === 'income' ? 'text-emerald-600' : 'text-red-600'}`} />Valor (R$)</label>
              <div className="relative">
                <span className={`absolute left-4 top-1/2 -translate-y-1/2 font-bold ${formData.type === 'income' ? 'text-emerald-600' : 'text-red-600'}`}>R$</span>
                <input 
                  type="text" 
                  name="amount" 
                  value={formData.amount} 
                  onChange={handleInputChange} 
                  onBlur={handleBlur} 
                  className={`w-full pl-16 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:border-transparent outline-none transition-all bg-slate-50 focus:bg-white font-bold text-xl ${
                    formData.type === 'income' 
                      ? 'focus:ring-emerald-600 text-emerald-700 placeholder:text-emerald-200' 
                      : 'focus:ring-red-600 text-red-700 placeholder:text-red-200'
                  }`} 
                  required 
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center"><Tag className="w-4 h-4 mr-2 text-blue-600" />Categoria</label>
              <select name="category" value={formData.category} onChange={handleInputChange} className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all bg-slate-50 focus:bg-white appearance-none text-slate-700 font-medium" required>
                <option value="" disabled>Selecione uma categoria...</option>
                {formData.type === 'income' ? (
                  <>
                    {incomeCategories.map(cat => (
                      <option key={cat.id} value={cat.name}>{cat.name}</option>
                    ))}
                    <option value="Outras Receitas">Outras Receitas</option>
                    <option value="new_category" className="font-bold text-blue-600">+ Nova Categoria...</option>
                  </>
                ) : (
                  <>
                    {expenseCategories.map(cat => (
                      <option key={cat.id} value={cat.name}>{cat.name}</option>
                    ))}
                    <option value="Outras Despesas">Outras Despesas</option>
                    <option value="new_category" className="font-bold text-blue-600">+ Nova Categoria...</option>
                  </>
                )}
              </select>
            </div>

            {/* Inventory Integration Fields */}
            {showInventoryFields && (
              <div className="md:col-span-2 bg-blue-50/50 p-6 rounded-2xl border border-blue-100 grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-top-2 duration-300">
                <div className="md:col-span-2 flex items-center space-x-2 text-blue-700 mb-2">
                  <Package className="w-5 h-5" />
                  <span className="font-bold text-sm uppercase tracking-tight text-blue-800">Vincular Abastecimento de Estoque</span>
                </div>
                
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-600 uppercase">Escolha o Produto</label>
                  <select 
                    name="productId" 
                    value={formData.productId} 
                    onChange={handleInputChange} 
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all bg-white appearance-none font-medium text-slate-700"
                    required
                  >
                    <option value="" disabled>Selecione ou cadastre...</option>
                    <option value="new" className="text-blue-600 font-bold">+ CADASTRAR NOVO PRODUTO</option>
                    {inventoryItems.map(item => (
                      <option key={item.id} value={item.id}>{item.name} ({item.unit})</option>
                    ))}
                  </select>
                </div>

                {formData.productId === 'new' && (
                  <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in duration-300">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-blue-600 uppercase">Nome do Novo Produto</label>
                      <input 
                        type="text" 
                        name="newProductName" 
                        value={formData.newProductName} 
                        onChange={handleInputChange} 
                        className="w-full px-4 py-2.5 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-600 outline-none bg-white text-sm"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-blue-600 uppercase">Unidade de Medida</label>
                      <select 
                        name="newProductUnit" 
                        value={formData.newProductUnit} 
                        onChange={handleInputChange} 
                        className="w-full px-4 py-2.5 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-600 outline-none bg-white text-sm"
                      >
                        <option value="un">un</option>
                        <option value="L">Litros (L)</option>
                        <option value="ml">ml</option>
                        <option value="Kg">Kg</option>
                        <option value="cx">Caixa</option>
                      </select>
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  <label className="text-xs font-bold text-slate-600 uppercase">Tipo de Movimentação</label>
                  {formData.type === 'income' ? (
                    <div className="py-2 px-4 rounded-xl border-2 border-red-500 bg-red-50 text-red-700 shadow-sm flex items-center space-x-2 w-fit">
                      <MinusCircle className="w-4 h-4" />
                      <span className="text-[11px] font-bold">Saída (-) — Venda</span>
                    </div>
                  ) : (
                    <div className="py-2 px-4 rounded-xl border-2 border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm flex items-center space-x-2 w-fit">
                      <PlusCircle className="w-4 h-4" />
                      <span className="text-[11px] font-bold">Entrada (+) — Compra</span>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-600 uppercase">Quantidade</label>
                  <div className="relative">
                    <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <input 
                      type="number" 
                      step="any"
                      min="0.01"
                      name="addQuantity" 
                      value={formData.addQuantity} 
                      onChange={handleInputChange} 
                      className="w-full pl-11 pr-16 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all bg-white font-mono font-bold"
                      required
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs uppercase">
                      {formData.productId === 'new' ? formData.newProductUnit : (inventoryItems.find(i => i.id.toString() === formData.productId)?.unit || 'un')}
                    </span>
                  </div>
                </div>
                <p className="md:col-span-2 text-[10.5px] text-blue-600/70 italic flex items-center">
                  <span className="w-1 h-1 bg-blue-400 rounded-full mr-2"></span>
                  Ao salvar, esta quantidade será {formData.type === 'income' ? 'subtraída' : 'somada'} automaticamente no estoque.
                </p>
                {stockError && (
                  <div className="md:col-span-2 flex items-start space-x-2 p-3 bg-red-50 border border-red-300 rounded-xl text-red-700">
                    <span className="text-base">⚠️</span>
                    <p className="text-xs font-semibold leading-snug">{stockError}</p>
                  </div>
                )}
              </div>
            )}

            <div className="md:col-span-2">
              <div className="flex items-center space-x-2 mb-2">
                <label className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center">
                  <AlignLeft className="w-4 h-4 mr-2 text-blue-600" />
                  Observações
                </label>
                <div className="group relative">
                  <button 
                    type="button" 
                    onClick={() => setShowNotesField(prev => !prev)}
                    className="p-1 hover:bg-slate-100 rounded-full cursor-pointer text-slate-400"
                    title="Adicionar observações"
                  >
                    {showNotesField ? <MinusCircle className="w-4 h-4" /> : <PlusCircle className="w-4 h-4" />}
                  </button>
                  <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block w-48 p-2 bg-slate-800 text-white text-[10px] rounded-lg shadow-xl z-10 text-center">
                    Campo opcional para detalhes adicionais da transação.
                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-slate-800"></div>
                  </div>
                </div>
              </div>
              {showNotesField && (
                <textarea 
                  name="notes" 
                  value={formData.notes} 
                  onChange={handleInputChange} 
                  rows={2} 
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all bg-slate-50 focus:bg-white resize-none text-sm animate-in fade-in slide-in-from-top-2 duration-200"
                ></textarea>
              )}
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Data da Transação</label>
              <input type="date" name="date" value={formData.date} onChange={handleInputChange} className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all bg-slate-50 focus:bg-white" required />
            </div>
          </div>
          
          <div className="pt-6 border-t border-slate-100 flex justify-end space-x-4">
            <Link to="/financeiro" className="px-6 py-3 border border-slate-300 text-slate-700 rounded-xl font-bold hover:bg-slate-50 transition-colors shadow-sm">Cancelar</Link>
            <button type="submit" disabled={loading} className={`px-8 py-3 text-white rounded-xl font-bold shadow-sm flex items-center transition-colors ${formData.type === 'income' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'}`}>
              <CheckCircle2 className="w-5 h-5 mr-2" />{loading ? 'Salvando...' : 'Salvar Transação'}
            </button>
          </div>
        </form>
      </div>

      {/* Manage Categories Modal */}
      {showNewCategoryModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div>
                <h3 className="text-xl font-bold text-slate-900">
                  {formData.type === 'income' ? 'Categorias de Receita' : 'Categorias de Despesa'}
                </h3>
                <p className="text-xs text-slate-500 font-medium">Gerencie suas classificações financeiras.</p>
              </div>
              <button 
                onClick={() => { setShowNewCategoryModal(false); setEditingId(null); setNewCatName(''); }}
                className="p-2 hover:bg-slate-200 rounded-lg transition-colors text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 max-h-[400px] overflow-y-auto space-y-3">
              {(formData.type === 'income' ? incomeCategories : expenseCategories).map((cat) => (
                <div key={cat.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200 group">
                  {editingId === cat.id ? (
                    <div className="flex items-center flex-1 space-x-2">
                      <input 
                        type="text" 
                        value={editName} 
                        onChange={(e) => setEditName(e.target.value)}
                        className="flex-1 px-3 py-1.5 border border-blue-500 rounded-lg outline-none text-sm font-medium"
                        autoFocus
                      />
                      <button 
                        type="button"
                        onClick={async () => {
                          if (!editName.trim()) return;
                          setLoading(true);
                          const tableName = formData.type === 'income' ? 'income_categories' : 'expense_categories';
                          const { error } = await supabase.from(tableName).update({ 
                            name: editName.trim(),
                            affects_inventory: editAffectsInventory
                          }).eq('id', cat.id);
                          if (!error) {
                            const updatedCat = { ...cat, name: editName.trim(), affects_inventory: editAffectsInventory };
                            if (formData.type === 'income') {
                              setIncomeCategories(prev => prev.map(c => c.id === cat.id ? updatedCat : c).sort((a,b) => a.name.localeCompare(b.name)));
                            } else {
                              setExpenseCategories(prev => prev.map(c => c.id === cat.id ? updatedCat : c).sort((a,b) => a.name.localeCompare(b.name)));
                            }
                            setEditingId(null);
                          }
                          setLoading(false);
                        }}
                        className="p-1.5 bg-emerald-100 text-emerald-600 rounded-lg hover:bg-emerald-200"
                        title="Salvar"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </button>
                      <button 
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="p-1.5 bg-slate-200 text-slate-600 rounded-lg hover:bg-slate-300"
                        title="Cancelar"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-700">{cat.name}</span>
                        {cat.affects_inventory && (
                          <span className="text-[9px] font-bold text-blue-600 uppercase flex items-center">
                            <Package className="w-3 h-3 mr-1" /> Movimenta Estoque
                          </span>
                        )}
                      </div>
                      <div className="flex space-x-1 transition-opacity">
                        <button 
                          type="button"
                          onClick={(e) => { 
                            e.preventDefault();
                            setEditingId(cat.id); 
                            setEditName(cat.name); 
                            setEditAffectsInventory(cat.affects_inventory || false);
                            setDeleteConfirmId(null);
                          }}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"
                          title="Editar Categoria"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        
                        {deleteConfirmId === cat.id ? (
                          <button 
                            type="button"
                            onClick={async (e) => {
                              e.preventDefault();
                              setLoading(true);
                              try {
                                const tableName = formData.type === 'income' ? 'income_categories' : 'expense_categories';
                                const { data, error } = await supabase.from(tableName).delete().eq('id', cat.id).select();
                                
                                if (error) {
                                  alert(`Falha no servidor: ${error.message}`);
                                } else if (!data || data.length === 0) {
                                  alert(`Erro RLS: Seu usuário não possui permissão para apagar esse registro no banco.`);
                                } else {
                                  if (formData.type === 'income') {
                                    setIncomeCategories(prev => prev.filter(c => c.id !== cat.id));
                                  } else {
                                    setExpenseCategories(prev => prev.filter(c => c.id !== cat.id));
                                  }
                                }
                              } catch (err) {
                                alert("Erro interno ao tentar excluir.");
                              } finally {
                                setLoading(false);
                                setDeleteConfirmId(null);
                              }
                            }}
                            className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center text-xs font-bold shadow flex-shrink-0 animate-in fade-in"
                            title="Confirmar Exclusão"
                          >
                            Tem Certeza?
                          </button>
                        ) : (
                          <button 
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              setDeleteConfirmId(cat.id);
                              setEditingId(null);
                            }}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg flex-shrink-0"
                            title="Excluir Categoria"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-100 space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Nova Categoria</label>
                <div className="flex space-x-2">
                  <input 
                    type="text" 
                    placeholder="Ex: Venda de Produtos"
                    value={newCatName} 
                    onChange={(e) => setNewCatName(e.target.value)} 
                    className="flex-1 px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all bg-white text-slate-900 font-medium text-sm" 
                  />
                </div>
                <label className="flex items-center space-x-2 cursor-pointer group/newcheck w-fit">
                  <input 
                    type="checkbox" 
                    checked={newCatAffectsInventory}
                    onChange={(e) => setNewCatAffectsInventory(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" 
                  />
                  <span className="text-[10px] font-bold text-slate-500 uppercase group-hover/newcheck:text-blue-600 transition-colors">Essa categoria movimenta estoque?</span>
                </label>
              </div>
              <div className="flex justify-end pt-2">
                <button 
                  type="button" 
                  onClick={async () => {
                    if (!newCatName.trim()) return;
                    setLoading(true);
                    const tableName = formData.type === 'income' ? 'income_categories' : 'expense_categories';
                    const { data, error } = await supabase.from(tableName).insert({
                      user_id: user!.id,
                      name: newCatName.trim(),
                      affects_inventory: newCatAffectsInventory
                    }).select().single();
                    if (!error && data) {
                      if (formData.type === 'income') {
                        setIncomeCategories(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
                      } else {
                        setExpenseCategories(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
                      }
                      setFormData(prev => ({ ...prev, category: data.name }));
                    }
                    setNewCatName('');
                    setNewCatAffectsInventory(false);
                    setLoading(false);
                  }}
                  disabled={loading || !newCatName.trim()}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors disabled:opacity-50 text-sm shadow-lg shadow-blue-200"
                >
                  Adicionar Categoria
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className={`p-6 text-white flex items-center space-x-3 ${formData.type === 'income' ? 'bg-emerald-600' : 'bg-red-600'}`}>
              <CheckCircle2 className="w-8 h-8" />
              <div>
                <h2 className="text-xl font-bold">Confirme a Transação</h2>
                <p className="text-white/80 text-sm">Verifique os dados antes de salvar.</p>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <span className="text-sm text-slate-500 font-medium">Tipo:</span>
                <span className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-wider ${formData.type === 'income' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                  {formData.type === 'income' ? 'Receita (Entrada)' : 'Despesa (Saída)'}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <span className="text-sm text-slate-500 font-medium">Descrição:</span>
                <span className="text-sm font-bold text-slate-800">{formData.description || '-'}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <span className="text-sm text-slate-500 font-medium">Valor:</span>
                <span className="text-lg font-black text-slate-900">
                  R$ {formData.amount || '0,00'}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <span className="text-sm text-slate-500 font-medium">Categoria:</span>
                <span className="text-sm font-bold text-slate-800 bg-slate-100 px-2 py-1 rounded-md">{formData.category || '-'}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <span className="text-sm text-slate-500 font-medium">Data:</span>
                <span className="text-sm font-bold text-slate-800">{formData.date?.split('-').reverse().join('/') || '-'}</span>
              </div>

              {showInventoryFields && formData.addQuantity && (
                <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-lg">
                  <div className="flex items-center text-blue-700 mb-1">
                    <Package className="w-4 h-4 mr-2" />
                    <span className="text-xs font-bold uppercase">Movimento de Estoque</span>
                  </div>
                  <p className="text-sm font-bold text-slate-700">
                    {formData.type === 'income' ? 'Retirada de' : 'Entrada de'} {formData.addQuantity} {formData.productId === 'new' ? formData.newProductUnit : (inventoryItems.find(i => i.id === formData.productId)?.unit || 'un')} - {formData.productId === 'new' ? formData.newProductName : inventoryItems.find(i => i.id === formData.productId)?.name}
                  </p>
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex space-x-3">
              <button 
                type="button" 
                onClick={() => setShowConfirmModal(false)} 
                disabled={loading}
                className="flex-1 py-3 px-4 border border-slate-200 text-slate-600 hover:bg-slate-100 font-bold rounded-xl transition-colors disabled:opacity-50"
              >
                Voltar e Editar
              </button>
              <button 
                type="button" 
                onClick={confirmTransaction}
                disabled={loading}
                className={`flex-1 py-3 px-4 font-bold rounded-xl transition-colors text-white shadow-lg disabled:opacity-50 ${formData.type === 'income' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200' : 'bg-red-600 hover:bg-red-700 shadow-red-200'}`}
              >
                {loading ? 'Salvando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
