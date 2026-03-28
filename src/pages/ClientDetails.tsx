import React, { useState, useEffect } from 'react';
import { ArrowLeft, User, Phone, Mail, MapPin, Car, Calendar, DollarSign, Edit, Trash2, Clock, MessageCircle, CheckCircle2 } from 'lucide-react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface Client {
  id: number;
  name: string;
  phone: string;
  address: string | null;
  created_at: string;
  vehicles: { id: number; plate: string; brand: string; model: string; color: string; year: string }[];
  history: { id: number; service_name: string; price: string; finished_at: string; vehicle_name: string }[];
}

export default function ClientDetails() {
  const { role } = useAuth();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [clientActive, setClientActive] = useState(false);

  useEffect(() => {
    const fetchClientData = async () => {
      if (!id) return;
      
      const { data: clientData } = await supabase
        .from('clients')
        .select(`
          *,
          vehicles(*)
        `)
        .eq('id', Number(id))
        .single();
        
      if (!clientData) {
        navigate('/clientes');
        return;
      }

      const { data: historyData } = await supabase
        .from('wash_queue')
        .select('id, service_name, price, finished_at, vehicle_name')
        .eq('client_id', Number(id))
        .eq('status', 'finished')
        .order('finished_at', { ascending: false });

      setClient({
        ...clientData,
        history: historyData || []
      });

      // compute activity: last visit within 30 days
      const lastVisit = (historyData && historyData.length > 0) ? historyData[0].finished_at : null;
      const isActive = lastVisit ? (Date.now() - new Date(lastVisit).getTime()) / (1000*60*60*24) <= 30 : false;
      setClientActive(isActive);

      setLoading(false);
    };

    fetchClientData();
  }, [id, navigate]);

  if (loading || !client) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const totalSpent = client.history.reduce((acc, curr) => {
    const value = parseFloat(curr.price.replace('R$', '').replace('.', '').replace(',', '.').trim() || '0');
    return acc + value;
  }, 0);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center space-x-4">
          <Link to="/clientes" className="p-2 bg-white border border-slate-200 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-colors shadow-sm"><ArrowLeft className="w-5 h-5" /></Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Perfil do Cliente</h1>
            <p className="text-slate-500 text-sm">Visualizando detalhes de {client.name}</p>
          </div>
        </div>
        <div className="flex space-x-3">
          <a
            href={`https://wa.me/55${client.phone}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 border border-emerald-500 bg-emerald-50 text-emerald-700 rounded-lg font-medium hover:bg-emerald-100 transition-colors flex items-center text-sm shadow-sm"
          >
            <MessageCircle className="w-4 h-4 mr-2" />WhatsApp
          </a>
          <Link to={`/clientes/editar/${client.id}`} className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors flex items-center text-sm shadow-sm"><Edit className="w-4 h-4 mr-2" />Editar Cliente</Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna Esquerda: Dados Pessoais & Resumo */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-6">
            <div className="flex flex-col items-center text-center pb-6 border-b border-slate-100">
              <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 shadow-inner mb-4">
                <User className="w-12 h-12" />
              </div>
              <h2 className="text-xl font-bold text-slate-900">{client.name}</h2>
              {clientActive ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 mt-2">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Cliente Ativo
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 mt-2">
                  <Clock className="w-3.5 h-3.5" /> Cliente Inativo
                </span>
              )}
            </div>
            
            <div className="pt-6 space-y-4">
              <div className="flex items-center text-slate-600"><Phone className="w-5 h-5 mr-3 text-slate-400" /><span className="text-sm font-medium">{client.phone}</span></div>
              {client.address && <div className="flex items-start text-slate-600"><MapPin className="w-5 h-5 mr-3 text-slate-400 flex-shrink-0" /><span className="text-sm font-medium">{client.address}</span></div>}
              <div className="flex items-center text-slate-600"><Calendar className="w-5 h-5 mr-3 text-slate-400" /><span className="text-sm font-medium">Cliente desde {new Date(client.created_at).toLocaleDateString('pt-BR')}</span></div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl shadow-sm overflow-hidden p-6 text-white relative">
            <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-white/10 rounded-full blur-xl"></div>
            <h3 className="text-blue-100 font-medium text-sm mb-1 uppercase tracking-wider">Total Gasto</h3>
            <div className={`text-3xl font-bold ${role !== 'admin' ? 'blur-finance' : ''}`}>R$ {totalSpent.toFixed(2).replace('.', ',')}</div>
            <div className="mt-4 pt-4 border-t border-white/20 flex justify-between items-center text-sm text-blue-100">
              <span>{client.history.length} serviços realizados</span>
            </div>
          </div>
        </div>

        {/* Coluna Direita: Veículos e Histórico */}
        <div className="lg:col-span-2 space-y-6">
          {/* Veículos */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-lg font-bold text-slate-900 flex items-center"><Car className="w-5 h-5 text-blue-600 mr-2" />Veículos Cadastrados</h3>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              {client.vehicles?.map(vehicle => (
                <div key={vehicle.id} className="border border-slate-200 rounded-xl p-4 flex flex-col hover:border-blue-300 transition-colors bg-slate-50/50">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-bold text-slate-900 text-lg">{vehicle.brand} {vehicle.model}</span>
                    <span className="font-mono bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm font-bold border border-blue-200">{vehicle.plate}</span>
                  </div>
                  <div className="flex text-sm text-slate-500 space-x-3 mt-auto pt-3 border-t border-slate-100">
                    {vehicle.year && <span>Ano: <strong>{vehicle.year}</strong></span>}
                    {vehicle.color && <span>Cor: <strong>{vehicle.color}</strong></span>}
                  </div>
                </div>
              ))}
              {(!client.vehicles || client.vehicles.length === 0) && (
                <div className="col-span-full py-8 text-center text-slate-500 text-sm">Nenhum veículo cadastrado.</div>
              )}
            </div>
          </div>

          {/* Histórico */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-lg font-bold text-slate-900 flex items-center"><Clock className="w-5 h-5 text-blue-600 mr-2" />Histórico de Serviços</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left font-sans">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Data</th>
                    <th className="px-6 py-4 font-semibold">Serviço</th>
                    <th className="px-6 py-4 font-semibold">Veículo</th>
                    <th className="px-6 py-4 font-semibold text-right">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {client.history.map((record) => (
                    <tr key={record.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 text-sm font-medium text-slate-700 whitespace-nowrap">
                        {new Date(record.finished_at).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-slate-900">{record.service_name}</td>
                      <td className="px-6 py-4 text-sm text-slate-600 bg-slate-50/50 rounded-md inline-block my-2 mx-6 border border-slate-100">{record.vehicle_name}</td>
                      <td className={`px-6 py-4 text-sm font-bold text-emerald-600 text-right whitespace-nowrap ${role !== 'admin' ? 'blur-finance' : ''}`}>{record.price}</td>
                    </tr>
                  ))}
                  {client.history.length === 0 && (
                    <tr><td colSpan={4} className="px-6 py-12 text-center text-slate-400 text-sm">Nenhum serviço registrado no histórico.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
