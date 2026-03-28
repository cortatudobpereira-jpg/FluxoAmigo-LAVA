import React, { useState, useEffect } from 'react';
import { ArrowLeft, Settings, CheckCircle2, DollarSign, Clock, FileText } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { formatCurrencyInput } from '../utils/format';

export default function EditService() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [formData, setFormData] = useState({ name: '', description: '', price: '', estimatedTime: '', status: 'active' });
  const [notFound, setNotFound] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    supabase.from('services').select('*').eq('id', Number(id)).single().then(({ data, error }) => {
      if (error || !data) { setNotFound(true); return; }
      setFormData({
        name: data.name,
        description: data.description,
        price: data.price.replace('R$', '').trim(),
        estimatedTime: data.estimated_time,
        status: data.status,
      });
    });
  }, [id]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === 'price' && value) {
      setFormData(prev => ({ ...prev, [name]: formatCurrencyInput(value) }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setSaving(true);
    await supabase.from('services').update({
      name: formData.name,
      description: formData.description,
      price: formData.price ? `R$ ${formData.price}` : 'R$ 0,00',
      estimated_time: formData.estimatedTime,
      status: formData.status,
    }).eq('id', Number(id));
    navigate('/servicos');
  };

  if (notFound) {
    return (
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="flex items-center space-x-4">
          <Link to="/servicos" className="p-2 bg-white border border-slate-200 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-colors shadow-sm"><ArrowLeft className="w-5 h-5" /></Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Serviço não encontrado</h1>
            <p className="text-slate-500 text-sm">O serviço que você está tentando editar não existe.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="flex items-center space-x-4">
        <Link to="/servicos" className="p-2 bg-white border border-slate-200 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-colors shadow-sm"><ArrowLeft className="w-5 h-5" /></Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Editar Serviço</h1>
          <p className="text-slate-500 text-sm">Atualize as informações do serviço.</p>
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <form onSubmit={handleSubmit} className="p-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center"><Settings className="w-4 h-4 mr-2 text-blue-600" />Nome do Serviço</label>
              <input type="text" name="name" value={formData.name} onChange={handleInputChange} placeholder="Ex: Lavagem a Seco" className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all bg-slate-50 focus:bg-white text-lg" required />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center"><FileText className="w-4 h-4 mr-2 text-blue-600" />Descrição</label>
              <textarea name="description" value={formData.description} onChange={handleInputChange} rows={3} placeholder="Detalhes do que está incluso neste serviço..." className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all bg-slate-50 focus:bg-white resize-none" required></textarea>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center"><DollarSign className="w-4 h-4 mr-2 text-emerald-600" />Valor (R$)</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">R$</span>
                <input type="text" name="price" value={formData.price} onChange={handleInputChange} onBlur={handleBlur} placeholder="0,00" className="w-full pl-14 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-600 focus:border-transparent outline-none transition-all bg-slate-50 focus:bg-white font-bold text-xl text-emerald-700 placeholder:text-slate-300" required />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center"><Clock className="w-4 h-4 mr-2 text-blue-600" />Tempo Estimado</label>
              <select name="estimatedTime" value={formData.estimatedTime} onChange={handleInputChange} className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all bg-slate-50 focus:bg-white appearance-none" required>
                <option value="" disabled>Selecione o tempo...</option>
                <option value="15 min">15 minutos</option>
                <option value="30 min">30 minutos</option>
                <option value="45 min">45 minutos</option>
                <option value="1 hora">1 hora</option>
                <option value="1 hora e 30 min">1 hora e 30 min</option>
                <option value="2 horas">2 horas</option>
                <option value="3 horas">3 horas</option>
                <option value="3 horas+">3 horas+</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Status</label>
              <select name="status" value={formData.status} onChange={handleInputChange} className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all bg-slate-50 focus:bg-white appearance-none">
                <option value="active">Ativo (Disponível para uso)</option>
                <option value="inactive">Inativo (Oculto)</option>
              </select>
            </div>
          </div>
          <div className="pt-6 border-t border-slate-100 flex justify-end space-x-4">
            <button type="button" onClick={() => navigate('/servicos')} className="px-6 py-3 border border-slate-300 text-slate-700 rounded-xl font-bold hover:bg-slate-50 transition-colors shadow-sm">Cancelar</button>
            <button type="submit" disabled={saving} className="px-8 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 disabled:bg-blue-400 transition-colors shadow-sm flex items-center">
              <CheckCircle2 className="w-5 h-5 mr-2" />{saving ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
