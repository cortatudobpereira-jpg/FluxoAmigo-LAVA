import React, { useState, useEffect } from 'react';
import { Search, Plus, Car, Clock, CheckCircle2, AlertCircle, PlayCircle, Info, ChevronLeft, ChevronRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { withTimeout } from '../lib/supabaseQuery';
import { useAuth } from '../contexts/AuthContext';
import { format } from 'date-fns';

interface WashService {
  id: number;
  vehicle_name: string;
  plate: string;
  client_name: string;
  service_name: string;
  status: 'waiting' | 'in_progress' | 'finished';
  arrival_time: string;
  finished_at?: string;
  is_new_client?: boolean;
  price: string;
}

export default function WashQueue() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [services, setServices] = useState<WashService[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const fetchQueue = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('wash_queue')
        .select('id, vehicle_name, plate, client_name, service_name, status, arrival_time, finished_at, is_new_client, price')
        .order('created_at', { ascending: false });

      if (!startDate && !endDate) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const endOfDay = new Date(today);
        endOfDay.setHours(23, 59, 59, 999);
        query = query.gte('created_at', today.toISOString()).lte('created_at', endOfDay.toISOString());
      } else {
        const activeStart = startDate || endDate;
        const activeEnd = endDate || startDate;
        
        const start = new Date(activeStart + 'T00:00:00');
        const end = new Date(activeEnd + 'T23:59:59.999');
        
        query = query.gte('created_at', start.toISOString());
        query = query.lte('created_at', end.toISOString());
      }

      const { data, error } = await withTimeout(query);
      if (error) {
        if (error.code === 'TIMEOUT') {
          console.warn('WashQueue query timed out, retrying once...');
          const { data: retryData } = await withTimeout(query, 5000);
          setServices(retryData || []);
          return;
        }
        throw error;
      }
      setServices(data || []);
    } catch (err) {
      console.error('Error fetching wash queue:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    fetchQueue(); 
    setCurrentPage(1);
  }, [startDate, endDate]);

  const updateStatus = async (id: number, newStatus: string) => {
    const updateData: any = { status: newStatus };
    if (newStatus === 'in_progress') updateData.started_at = new Date().toISOString();
    if (newStatus === 'finished') {
      updateData.finished_at = new Date().toISOString();
      
      // Feed the cash flow ONLY when finishing
      const service = services.find(s => s.id === id);
      if (service) {
        await supabase.from('transactions').insert({
          user_id: user!.id,
          type: 'income',
          description: `${service.service_name} - ${service.plate}`,
          amount: service.price,
          category: 'Serviços',
          date: format(new Date(), 'yyyy-MM-dd'),
          status: 'completed'
        });
      }
    }

    await supabase.from('wash_queue').update(updateData).eq('id', id);
    fetchQueue();
  };

  const filteredServices = services.filter(service => {
    const searchLower = searchTerm.toLowerCase();
    const searchMatch = service.vehicle_name.toLowerCase().includes(searchLower) ||
                        service.plate.toLowerCase().includes(searchLower) ||
                        service.client_name.toLowerCase().includes(searchLower);
    if (filter === 'all') return searchMatch;
    return searchMatch && service.status === filter;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'waiting':
        return <span className="px-3 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded-md border border-amber-200 flex items-center"><Clock className="w-3 h-3 mr-1" />Aguardando</span>;
      case 'in_progress':
        return <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-md border border-blue-200 flex items-center"><PlayCircle className="w-3 h-3 mr-1" />Em Andamento</span>;
      case 'finished':
        return <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-md border border-emerald-200 flex items-center"><CheckCircle2 className="w-3 h-3 mr-1" />Finalizado</span>;
      default:
        return null;
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
          <h1 className="text-2xl font-bold text-slate-900">Fila de Lavagem</h1>
          <p className="text-slate-500 text-sm">Gerencie os veículos que estão no pátio hoje.</p>
        </div>
        <Link to="/lavagem/nova" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm flex items-center"><Plus className="w-4 h-4 mr-2" />Nova Entrada</Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="group relative bg-white p-6 rounded-[2rem] border border-slate-200/60 shadow-[0_10px_40px_-15px_rgba(0,0,0,0.04)] hover:shadow-[0_20px_50px_-12px_rgba(37,99,235,0.12)] transition-all duration-500 overflow-hidden">
          <div className="absolute -top-6 -right-6 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl group-hover:bg-blue-500/10 transition-colors duration-500" />
          <div className="relative z-10 flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 shadow-sm border border-blue-100 group-hover:scale-110 transition-transform duration-500">
              <Car className="w-6 h-6" />
            </div>
            <div className="text-[10px] font-black text-blue-600/40 uppercase tracking-[0.2em]">Total do Dia</div>
          </div>
          <div className="relative z-10">
            <div className="flex items-baseline gap-1">
              <h2 className="text-3xl font-black tracking-tight text-slate-900 group-hover:text-blue-600 transition-colors duration-500">
                {services.length}
              </h2>
              <span className="text-xs font-bold text-slate-400 uppercase ml-1">Veículos</span>
            </div>
            <div className="mt-2 flex items-center text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Fluxo Geral
            </div>
          </div>
        </div>

        <div className="group relative bg-white p-6 rounded-[2rem] border border-slate-200/60 shadow-[0_10px_40px_-15px_rgba(0,0,0,0.04)] hover:shadow-[0_20px_50px_-12px_rgba(245,158,11,0.12)] transition-all duration-500 overflow-hidden">
          <div className="absolute -top-6 -right-6 w-32 h-32 bg-amber-500/5 rounded-full blur-3xl group-hover:bg-amber-500/10 transition-colors duration-500" />
          <div className="relative z-10 flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600 shadow-sm border border-amber-100 group-hover:scale-110 transition-transform duration-500">
              <Clock className="w-6 h-6" />
            </div>
            <div className="text-[10px] font-black text-amber-600/40 uppercase tracking-[0.2em]">Aguardando</div>
          </div>
          <div className="relative z-10">
            <div className="flex items-baseline gap-1">
              <h2 className="text-3xl font-black tracking-tight text-slate-900 group-hover:text-amber-600 transition-colors duration-500">
                {services.filter(s => s.status === 'waiting').length}
              </h2>
              <span className="text-xs font-bold text-slate-400 uppercase ml-1">Fila</span>
            </div>
            <div className="mt-2 flex items-center text-[10px] font-bold text-amber-500 uppercase tracking-wider">
              Pendentes
            </div>
          </div>
        </div>

        <div className="group relative bg-white p-6 rounded-[2rem] border border-slate-200/60 shadow-[0_10px_40px_-15px_rgba(0,0,0,0.04)] hover:shadow-[0_20px_50px_-12px_rgba(37,99,235,0.12)] transition-all duration-500 overflow-hidden">
          <div className="absolute -top-6 -right-6 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl group-hover:bg-blue-500/10 transition-colors duration-500" />
          <div className="relative z-10 flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 shadow-sm border border-blue-100 group-hover:scale-110 transition-transform duration-500">
              <PlayCircle className="w-6 h-6" />
            </div>
            <div className="text-[10px] font-black text-blue-600/40 uppercase tracking-[0.2em]">Em Andamento</div>
          </div>
          <div className="relative z-10">
            <div className="flex items-baseline gap-1">
              <h2 className="text-3xl font-black tracking-tight text-slate-900 group-hover:text-blue-600 transition-colors duration-500">
                {services.filter(s => s.status === 'in_progress').length}
              </h2>
              <span className="text-xs font-bold text-slate-400 uppercase ml-1">Execução</span>
            </div>
            <div className="mt-2 flex items-center text-[10px] font-bold text-blue-500 uppercase tracking-wider">
              Sendo Lavados
            </div>
          </div>
        </div>

        <div className="group relative bg-white p-6 rounded-[2rem] border border-slate-200/60 shadow-[0_10px_40px_-15px_rgba(0,0,0,0.04)] hover:shadow-[0_20px_50px_-12px_rgba(16,185,129,0.12)] transition-all duration-500 overflow-hidden">
          <div className="absolute -top-6 -right-6 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl group-hover:bg-emerald-500/10 transition-colors duration-500" />
          <div className="relative z-10 flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 shadow-sm border border-emerald-100 group-hover:scale-110 transition-transform duration-500">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div className="text-[10px] font-black text-emerald-600/40 uppercase tracking-[0.2em]">Finalizados</div>
          </div>
          <div className="relative z-10">
            <div className="flex items-baseline gap-1">
              <h2 className="text-3xl font-black tracking-tight text-slate-900 group-hover:text-emerald-600 transition-colors duration-500">
                {services.filter(s => s.status === 'finished').length}
              </h2>
              <span className="text-xs font-bold text-slate-400 uppercase ml-1">Concluídos</span>
            </div>
            <div className="mt-2 flex items-center text-[10px] font-bold text-emerald-500 uppercase tracking-wider">
              Prontos
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-4">
        <div className="flex flex-col xl:flex-row gap-4 justify-between items-center w-full">
          <div className="relative w-full xl:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input type="text" placeholder="Buscar por placa, veículo ou cliente..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none text-sm transition-all" />
          </div>
          <div className="flex flex-col sm:flex-row gap-4 items-center w-full xl:w-auto">
            <div className="flex items-center space-x-2 w-full sm:w-auto">
              <input 
                type="date" 
                value={startDate} 
                onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-600 outline-none text-slate-700 bg-slate-50 w-full sm:w-auto uppercase"
              />
              <span className="text-slate-500 text-sm font-medium">até</span>
              <input 
                type="date" 
                value={endDate} 
                onChange={(e) => setEndDate(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-600 outline-none text-slate-700 bg-slate-50 w-full sm:w-auto uppercase"
              />
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2 w-full overflow-x-auto pb-1 sm:pb-0">
          <button onClick={() => setFilter('all')} className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${filter === 'all' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>Todos</button>
          <button onClick={() => setFilter('waiting')} className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${filter === 'waiting' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>Aguardando</button>
          <button onClick={() => setFilter('in_progress')} className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${filter === 'in_progress' ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>Em Andamento</button>
          <button onClick={() => setFilter('finished')} className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${filter === 'finished' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>Finalizados</button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left font-sans">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 font-semibold">Veículo / Cliente</th>
                <th className="px-6 py-4 font-semibold">Placa</th>
                <th className="px-6 py-4 font-semibold">Serviço</th>
                <th className="px-6 py-4 font-semibold">Chegada / Saída</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredServices.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((service) => (
                <tr key={service.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center mr-3 text-slate-600"><Car className="w-5 h-5" /></div>
                      <div>
                        <p className="font-bold text-sm text-slate-900">{service.vehicle_name}</p>
                        <p className="text-xs text-slate-500 flex items-center gap-2">
                          {service.client_name}
                          {service.is_new_client && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-600 border border-blue-200">
                              Novo
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4"><span className="font-mono bg-slate-100 text-slate-700 px-2 py-1 rounded text-sm font-bold border border-slate-200">{service.plate}</span></td>
                  <td className="px-6 py-4"><span className="text-sm font-medium text-slate-700 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-100">{service.service_name}</span></td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1.5">
                      <div className="text-sm text-slate-500 font-medium flex items-center">
                        <span className="w-16 text-slate-400 text-[10px] uppercase font-bold tracking-wider">Chegada</span>
                        <span>{service.arrival_time}</span>
                      </div>
                      <div className="text-sm text-slate-700 font-bold flex items-center">
                        <span className="w-16 text-slate-400 text-[10px] uppercase font-bold tracking-wider">Saída</span>
                        <span>{service.finished_at ? format(new Date(service.finished_at), 'HH:mm') : '-'}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">{getStatusBadge(service.status)}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end space-x-2">
                      {service.status === 'waiting' && <button onClick={() => updateStatus(service.id, 'in_progress')} className="px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-sm font-semibold transition-colors border border-blue-200">Iniciar</button>}
                      {service.status === 'in_progress' && <button onClick={() => updateStatus(service.id, 'finished')} className="px-3 py-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg text-sm font-semibold transition-colors border border-emerald-200">Finalizar</button>}
                      <button className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors border border-transparent hover:border-slate-200" title="Detalhes"><Info className="w-5 h-5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredServices.length === 0 && (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-400 text-sm">Nenhum veículo na fila de lavagem {filter !== 'all' ? 'com este status' : 'hoje'}.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && filteredServices.length > itemsPerPage && (
          <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Página <span className="text-blue-600">{currentPage}</span> de <span className="text-slate-900">{Math.ceil(filteredServices.length / itemsPerPage)}</span>
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
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(filteredServices.length / itemsPerPage)))}
                disabled={currentPage === Math.ceil(filteredServices.length / itemsPerPage)}
                className={`p-2 rounded-lg border border-slate-200 transition-all ${currentPage === Math.ceil(filteredServices.length / itemsPerPage) ? 'text-slate-300 bg-slate-50 cursor-not-allowed' : 'text-slate-600 bg-white hover:bg-slate-50 active:scale-95 shadow-sm'}`}
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
