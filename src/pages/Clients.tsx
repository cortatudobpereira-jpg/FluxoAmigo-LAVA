import React, { useState, useEffect } from 'react';
import { Search, Plus, Phone, Mail, Car, Trash2, X, AlertTriangle, MessageCircle, CheckCircle2, Clock } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { withTimeout } from '../lib/supabaseQuery';
import { useAuth } from '../contexts/AuthContext';

interface Client {
  id: number;
  name: string;
  phone: string;
  address: string | null;
  vehicles?: { id: number; plate: string; brand: string; model: string }[];
  lastVisit?: string | null;
  isNew?: boolean;
}

const INACTIVE_DAYS = 30;

function isClientActive(lastVisit?: string | null): boolean {
  if (!lastVisit) return false;
  const diff = (Date.now() - new Date(lastVisit).getTime()) / (1000 * 60 * 60 * 24);
  return diff <= INACTIVE_DAYS;
}

export default function Clients() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [loading, setLoading] = useState(true);
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; client: Client | null }>({ open: false, client: null });

  const fetchClients = async () => {
    const { data: clientsData } = await withTimeout(
      supabase
        .from('clients')
        .select('*, vehicles(id, plate, brand, model)')
        .order('name', { ascending: true })
    );

    if (!clientsData) { setLoading(false); return; }

    // Fetch last visit for each client from wash_queue
    const { data: visitsData } = await withTimeout(
      supabase
        .from('wash_queue')
        .select('client_id, finished_at')
        .eq('status', 'finished')
        .not('finished_at', 'is', null)
        .order('finished_at', { ascending: false })
    );

    // Build map: client_id -> last_visit AND count
    const lastVisitMap: Record<number, string> = {};
    const washCountMap: Record<number, number> = {};
    (visitsData || []).forEach((v: { client_id: number; finished_at: string }) => {
      if (!lastVisitMap[v.client_id]) {
        lastVisitMap[v.client_id] = v.finished_at;
      }
      washCountMap[v.client_id] = (washCountMap[v.client_id] || 0) + 1;
    });

    const enriched = clientsData.map(c => ({
      ...c,
      lastVisit: lastVisitMap[c.id] || null,
      isNew: (washCountMap[c.id] || 0) <= 1  // 0 or 1 finished wash = still 'new'
    }));

    setClients(enriched);
    setLoading(false);
  };

  useEffect(() => { fetchClients(); }, []);

  const filtered = clients
    .filter(client => {
      const searchLower = searchTerm.toLowerCase();
      const matchSearch =
        client.name.toLowerCase().includes(searchLower) ||
        client.phone.includes(searchLower) ||
        client.vehicles?.some(v => v.plate.toLowerCase().includes(searchLower) || v.model.toLowerCase().includes(searchLower));
      if (!matchSearch) return false;

      const active = isClientActive(client.lastVisit);
      if (statusFilter === 'active') return active;
      if (statusFilter === 'inactive') return !active;
      return true;
    });

  const activeCount = clients.filter(c => isClientActive(c.lastVisit)).length;
  const inactiveCount = clients.filter(c => !isClientActive(c.lastVisit)).length;

  const handleDelete = (client: Client) => setDeleteModal({ open: true, client });
  const confirmDelete = async () => {
    if (deleteModal.client) {
      await supabase.from('clients').delete().eq('id', deleteModal.client.id);
      setDeleteModal({ open: false, client: null });
      fetchClients();
    }
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
          <h1 className="text-2xl font-bold text-slate-900">Clientes</h1>
          <p className="text-slate-500 text-sm">Gerencie o cadastro e histórico dos seus clientes.</p>
        </div>
        <Link
          to="/clientes/novo"
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm flex items-center"
        >
          <Plus className="w-4 h-4 mr-2" />
          Novo Cliente
        </Link>
      </div>

      {/* Search + Filter */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center gap-4">
        <div className="relative w-full md:flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Buscar por nome, telefone ou placa..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none text-sm transition-all"
          />
        </div>

        {/* Status filter tabs */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <button
            onClick={() => setStatusFilter('all')}
            className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-sm font-semibold transition-all ${statusFilter === 'all' ? 'bg-slate-800 text-white shadow' : 'text-slate-500 bg-slate-100 hover:bg-slate-200'}`}
          >
            Todos ({clients.length})
          </button>
          <button
            onClick={() => setStatusFilter('active')}
            className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-sm font-semibold transition-all ${statusFilter === 'active' ? 'bg-emerald-600 text-white shadow' : 'text-slate-500 bg-slate-100 hover:bg-slate-200'}`}
          >
            Ativos ({activeCount})
          </button>
          <button
            onClick={() => setStatusFilter('inactive')}
            className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-sm font-semibold transition-all ${statusFilter === 'inactive' ? 'bg-amber-500 text-white shadow' : 'text-slate-500 bg-slate-100 hover:bg-slate-200'}`}
          >
            Inativos ({inactiveCount})
          </button>
        </div>
      </div>

      {/* Client Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((client) => {
          const active = isClientActive(client.lastVisit);
          return (
            <div key={client.id} className={`flex flex-col h-full bg-white rounded-2xl border shadow-sm hover:shadow-md transition-all overflow-hidden group ${active ? 'border-slate-200' : 'border-amber-200'}`}>
              <div className="p-6 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="text-lg font-bold text-slate-900 truncate">{client.name}</h3>
                      {active ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200 whitespace-nowrap">
                          <CheckCircle2 className="w-3 h-3" /> Ativo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-200 whitespace-nowrap">
                          <Clock className="w-3 h-3" /> Inativo
                        </span>
                      )}
                      {client.isNew && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-600 border border-blue-200 whitespace-nowrap">
                          ✨ Novo
                        </span>
                      )}
                    </div>
                    <div className="flex items-center mt-1 text-slate-500 text-sm">
                      <Phone className="w-4 h-4 mr-1.5" />
                      {client.phone}
                    </div>
                    {client.lastVisit && (
                      <p className="text-xs text-slate-400 mt-1">
                        Última visita: {new Date(client.lastVisit).toLocaleDateString('pt-BR')}
                      </p>
                    )}
                    {!client.lastVisit && (
                      <p className="text-xs text-slate-400 mt-1 italic">Nenhum serviço registrado</p>
                    )}
                  </div>
                  <div className="flex items-center space-x-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                    <button onClick={() => handleDelete(client)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 mt-4">
                  <div className="text-sm font-semibold text-slate-700 mb-3 flex items-center">
                    <Car className="w-4 h-4 mr-1.5 text-blue-600" />
                    Veículos ({client.vehicles?.length || 0})
                  </div>
                  <div className="space-y-2">
                    {client.vehicles?.slice(0, 2).map((vehicle) => (
                      <div key={vehicle.id} className="flex justify-between items-center bg-slate-50 p-2 rounded-lg text-sm border border-slate-100">
                        <span className="font-medium text-slate-700">{vehicle.brand} {vehicle.model}</span>
                        <span className="text-slate-500 font-mono bg-white px-2 py-0.5 rounded border border-slate-200">{vehicle.plate}</span>
                      </div>
                    ))}
                    {(client.vehicles?.length || 0) > 2 && (
                      <div className="text-center text-xs text-blue-600 font-medium pt-1">
                        + {(client.vehicles?.length || 0) - 2} veículos
                      </div>
                    )}
                  </div>
                </div>

                <div className="grow"></div>
              </div>

              {/* Footer actions */}
              <div className="flex border-t border-slate-100 mt-auto">
                <Link
                  to={`/clientes/${client.id}`}
                  className="flex-1 py-3 bg-slate-50 text-center font-semibold text-blue-600 hover:bg-blue-50 transition-colors text-sm"
                >
                  Ver perfil
                </Link>
                <a
                  href={`https://wa.me/55${client.phone}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-3 bg-slate-50 text-emerald-600 border-l border-slate-100 hover:bg-emerald-50 transition-colors flex items-center gap-1.5 text-sm font-semibold"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>WhatsApp</span>
                </a>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="col-span-full py-12 text-center bg-white rounded-2xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-1">Nenhum cliente encontrado</h3>
            <p className="text-slate-500 text-sm">Tente ajustar os filtros de busca ou cadastre um novo cliente.</p>
          </div>
        )}
      </div>

      {/* Delete Modal */}
      {deleteModal.open && deleteModal.client && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setDeleteModal({ open: false, client: null })} />
          <div className="relative bg-white rounded-2xl shadow-xl border border-slate-200 p-6 max-w-md w-full space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center"><AlertTriangle className="w-5 h-5 text-red-600" /></div>
                <h3 className="text-lg font-bold text-slate-900">Excluir Cliente</h3>
              </div>
              <button onClick={() => setDeleteModal({ open: false, client: null })} className="p-1 hover:bg-slate-100 rounded-lg transition-colors"><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <p className="text-sm text-slate-600">Tem certeza que deseja excluir o cliente <strong>{deleteModal.client.name}</strong> e todos os seus veículos e histórico? Esta ação não pode ser desfeita.</p>
            <div className="flex justify-end space-x-3 pt-2">
              <button onClick={() => setDeleteModal({ open: false, client: null })} className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors text-sm">Cancelar</button>
              <button onClick={confirmDelete} className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors text-sm">Sim, Excluir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
