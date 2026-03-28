import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit, Trash2, Settings, Clock, X, AlertTriangle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { withTimeout } from '../lib/supabaseQuery';
import { useAuth } from '../contexts/AuthContext';

interface Service {
  id: number;
  name: string;
  description: string;
  price: string;
  estimated_time: string;
  status: string;
}

export default function Services() {
  const navigate = useNavigate();
  const { role } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; service: Service | null }>({ open: false, service: null });

  const fetchServices = async () => {
    const { data } = await withTimeout(
      supabase.from('services').select('*').order('created_at', { ascending: true })
    );
    setServices(data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchServices(); }, []);

  const filteredServices = services.filter(service => {
    const matchesSearch = service.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          service.description.toLowerCase().includes(searchTerm.toLowerCase());
    if (filter === 'all') return matchesSearch;
    return matchesSearch && service.status === filter;
  });

  const handleDelete = (service: Service) => {
    setDeleteModal({ open: true, service });
  };

  const confirmDelete = async () => {
    if (deleteModal.service) {
      await supabase.from('services').delete().eq('id', deleteModal.service.id);
      setDeleteModal({ open: false, service: null });
      fetchServices();
    }
  };

  const handleToggleStatus = async (service: Service) => {
    const newStatus = service.status === 'active' ? 'inactive' : 'active';
    await supabase.from('services').update({ status: newStatus }).eq('id', service.id);
    fetchServices();
  };

  if (loading) {
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
          <h1 className="text-2xl font-bold text-slate-900">Tipos de Serviço</h1>
          <p className="text-slate-500 text-sm">Gerencie os serviços oferecidos e seus valores.</p>
        </div>
        <Link
          to="/servicos/novo"
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm flex items-center"
        >
          <Plus className="w-4 h-4 mr-2" />
          Novo Serviço
        </Link>
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-4 justify-between items-center">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Buscar por nome ou descrição..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none text-sm transition-all"
          />
        </div>
        <div className="flex items-center space-x-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <button onClick={() => setFilter('all')} className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${filter === 'all' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>Todos</button>
          <button onClick={() => setFilter('active')} className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${filter === 'active' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>Ativos</button>
          <button onClick={() => setFilter('inactive')} className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${filter === 'inactive' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>Inativos</button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 font-semibold">Serviço</th>
                <th className="px-6 py-4 font-semibold">Descrição</th>
                <th className="px-6 py-4 font-semibold text-center">Tempo Est.</th>
                <th className="px-6 py-4 font-semibold text-right">Valor</th>
                <th className="px-6 py-4 font-semibold text-center">Status</th>
                <th className="px-6 py-4 font-semibold text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredServices.map((service) => (
                <tr key={service.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center mr-3 text-blue-600 border border-blue-100">
                        <Settings className="w-5 h-5" />
                      </div>
                      <span className="font-bold text-sm text-slate-900">{service.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4"><span className="text-sm text-slate-500 line-clamp-1">{service.description}</span></td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center text-sm text-slate-600">
                      <Clock className="w-4 h-4 mr-1.5 text-slate-400" />{service.estimated_time}
                    </div>
                  </td>
                  <td className={`px-6 py-4 text-sm font-bold text-emerald-600 text-right ${role !== 'admin' ? 'blur-finance' : ''}`}>{service.price}</td>
                  <td className="px-6 py-4 text-center">
                    <button onClick={() => handleToggleStatus(service)} title="Clique para alternar o status">
                      {service.status === 'active' ? (
                        <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-md border border-emerald-200 cursor-pointer hover:bg-emerald-200 transition-colors">Ativo</span>
                      ) : (
                        <span className="px-2.5 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded-md border border-slate-200 cursor-pointer hover:bg-slate-200 transition-colors">Inativo</span>
                      )}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end space-x-2">
                      <button onClick={() => navigate(`/servicos/editar/${service.id}`)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-200" title="Editar"><Edit className="w-4 h-4" /></button>
                      <button onClick={() => handleDelete(service)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-200" title="Excluir"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredServices.length === 0 && (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-400 text-sm">Nenhum serviço encontrado.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-sm text-slate-500">
          <span>Mostrando {filteredServices.length} de {services.length} serviços</span>
        </div>
      </div>

      {deleteModal.open && deleteModal.service && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setDeleteModal({ open: false, service: null })} />
          <div className="relative bg-white rounded-2xl shadow-xl border border-slate-200 p-6 max-w-md w-full space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center"><AlertTriangle className="w-5 h-5 text-red-600" /></div>
                <h3 className="text-lg font-bold text-slate-900">Excluir Serviço</h3>
              </div>
              <button onClick={() => setDeleteModal({ open: false, service: null })} className="p-1 hover:bg-slate-100 rounded-lg transition-colors"><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <p className="text-sm text-slate-600">Tem certeza que deseja excluir o serviço <strong>"{deleteModal.service.name}"</strong>? Esta ação não pode ser desfeita.</p>
            <div className="flex justify-end space-x-3 pt-2">
              <button onClick={() => setDeleteModal({ open: false, service: null })} className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors text-sm">Cancelar</button>
              <button onClick={confirmDelete} className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors text-sm">Sim, Excluir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
