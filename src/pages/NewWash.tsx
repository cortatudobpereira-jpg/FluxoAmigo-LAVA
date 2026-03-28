import React, { useState, useEffect } from 'react';
import { ArrowLeft, Car, User, Settings, CheckCircle2, Search, PlusCircle, AlertTriangle, Clock } from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export default function NewWash() {
  const navigate = useNavigate();
  const location = useLocation();
  const newClientId: number | null = (location.state as any)?.newClientId ?? null;
  const { user, role } = useAuth();
  const [step, setStep] = useState(1);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [saving, setSaving] = useState(false);

  const [dbClients, setDbClients] = useState<any[]>([]);
  const [dbVehicles, setDbVehicles] = useState<any[]>([]);
  const [dbServices, setDbServices] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const [clientsRes, vehiclesRes, servicesRes] = await Promise.all([
        supabase.from('clients').select('*'),
        supabase.from('vehicles').select('*'),
        supabase.from('services').select('*').eq('status', 'active')
      ]);

      setDbClients(clientsRes.data || []);
      setDbVehicles(vehiclesRes.data || []);
      setDbServices(servicesRes.data || []);
      setLoadingInitial(false);
    };
    fetchData();
  }, []);

  // Auto-select new client's first vehicle and advance to step 2
  useEffect(() => {
    if (!loadingInitial && newClientId && dbVehicles.length > 0) {
      const clientVehicle = dbVehicles.find((v: any) => v.client_id === newClientId);
      if (clientVehicle) {
        setSelectedVehicle(clientVehicle.id);
        setSelectedClient(newClientId);
        setStep(2);
      }
    }
  }, [loadingInitial, newClientId, dbVehicles]);

  const [selectedVehicle, setSelectedVehicle] = useState<number | null>(null);
  const [selectedClient, setSelectedClient] = useState<number | null>(null);
  const [selectedService, setSelectedService] = useState<number | null>(null);
  const [arrivalTime, setArrivalTime] = useState(
    new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  );

  const [searchTermVehicle, setSearchTermVehicle] = useState('');
  const [searchTermClient, setSearchTermClient] = useState('');

  const nextStep = () => setStep(step + 1);
  const prevStep = () => setStep(step - 1);

  const handleSubmit = async () => {
    setSaving(true);
    const vehicle = dbVehicles.find(v => v.id === selectedVehicle);
    const client = dbClients.find(c => c.id === selectedClient);
    const service = dbServices.find(s => s.id === selectedService);

    if (!vehicle || !client || !service) {
        setSaving(false);
        return;
    }

    // Check if client is new (has no past completed services)
    const { count: pastWashesCount } = await supabase
      .from('wash_queue')
      .select('*', { count: 'exact', head: true })
      .eq('client_id', client.id)
      .eq('status', 'finished');
      
    const isNewClient = pastWashesCount === 0;

    const { error } = await supabase.from('wash_queue').insert({
        user_id: user!.id,
        client_id: client.id,
        vehicle_id: vehicle.id,
        service_id: service.id,
        vehicle_name: `${vehicle.brand} ${vehicle.model}`,
        plate: vehicle.plate,
        client_name: client.name,
        client_phone: client.phone,
        service_name: service.name,
        price: service.price,
        estimated_time: service.estimated_time,
        status: 'waiting',
        arrival_time: arrivalTime,
        is_new_client: isNewClient
    });

    if (!error) {
        navigate('/fila');
    } else {
        console.error(error);
        setSaving(false);
    }
  };

  const filteredVehicles = dbVehicles.filter(v => v.plate.toLowerCase().includes(searchTermVehicle.toLowerCase()) || v.model.toLowerCase().includes(searchTermVehicle.toLowerCase()));
  const filteredClients = dbClients.filter(c => c.name.toLowerCase().includes(searchTermClient.toLowerCase()) || c.phone.includes(searchTermClient));

  if (loadingInitial) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/*... header & progress bar ... */}
      <div className="flex items-center space-x-4">
        <Link to="/fila" className="p-2 bg-white border border-slate-200 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-colors shadow-sm"><ArrowLeft className="w-5 h-5" /></Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Nova Lavagem</h1>
          <p className="text-slate-500 text-sm">Adicione um veículo à fila de lavagem.</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-8">
        <div className="flex items-center justify-between relative">
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-slate-100 z-0 rounded-full"></div>
          <div className={`absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-blue-600 z-0 rounded-full transition-all duration-500 ${step === 1 ? 'w-0' : step === 2 ? 'w-1/2' : 'w-full'}`}></div>
          <div className={`relative z-10 flex flex-col items-center space-y-2 ${step >= 1 ? 'text-blue-600' : 'text-slate-400'}`}>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold border-2 transition-colors ${step >= 1 ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-200' : 'bg-white text-slate-400 border-slate-200'}`}>1</div>
            <span className="text-xs font-bold uppercase tracking-wider">Veículo</span>
          </div>
          <div className={`relative z-10 flex flex-col items-center space-y-2 ${step >= 2 ? 'text-blue-600' : 'text-slate-400'}`}>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold border-2 transition-colors ${step >= 2 ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-200' : 'bg-white text-slate-400 border-slate-200'}`}>2</div>
            <span className="text-xs font-bold uppercase tracking-wider">Cliente</span>
          </div>
          <div className={`relative z-10 flex flex-col items-center space-y-2 ${step >= 3 ? 'text-blue-600' : 'text-slate-400'}`}>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold border-2 transition-colors ${step >= 3 ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-200' : 'bg-white text-slate-400 border-slate-200'}`}>3</div>
            <span className="text-xs font-bold uppercase tracking-wider">Serviço</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {step === 1 && (
          <div className="p-8 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600"><Car className="w-5 h-5" /></div>
                <h2 className="text-xl font-bold text-slate-900">Selecione o Veículo</h2>
              </div>
              <Link
                to="/clientes/novo?returnTo=/lavagem/nova"
                className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-xl border border-blue-200 transition-colors"
              >
                <PlusCircle className="w-4 h-4" /> Novo Cliente
              </Link>
            </div>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input type="text" placeholder="Buscar por placa ou modelo..." value={searchTermVehicle} onChange={(e) => setSearchTermVehicle(e.target.value)} className="w-full pl-12 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all bg-slate-50 focus:bg-white text-lg" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[400px] overflow-y-auto pr-2">
              {filteredVehicles.map((vehicle) => (
                <div key={vehicle.id} onClick={() => { setSelectedVehicle(vehicle.id); setSelectedClient(vehicle.client_id); }} className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${selectedVehicle === vehicle.id ? 'border-blue-600 bg-blue-50 shadow-sm' : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'}`}>
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-bold text-slate-900 text-lg">{vehicle.brand} {vehicle.model}</span>
                    <span className="font-mono bg-white px-2 py-1 rounded text-sm font-bold border border-slate-200">{vehicle.plate}</span>
                  </div>
                  <div className="flex flex-col text-sm space-y-1">
                    <span className="text-slate-700 font-medium">Cliente: {dbClients.find(c => c.id === vehicle.client_id)?.name || 'Desconhecido'}</span>
                    <div className="flex text-slate-500 space-x-3">
                      {vehicle.color && <span>Cor: {vehicle.color}</span>}
                    </div>
                  </div>
                </div>
              ))}
              {filteredVehicles.length === 0 && (
                <div className="col-span-full py-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-300">
                  <p className="text-slate-500 text-sm mb-4">Veículo não encontrado.</p>
                  <Link to="/clientes/novo" className="inline-flex items-center text-sm font-semibold text-blue-600 hover:text-blue-700 bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm"><PlusCircle className="w-4 h-4 mr-2" />Cadastrar Novo Cliente/Veículo</Link>
                </div>
              )}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="p-8 space-y-6">
            <div className="flex items-center space-x-3 pb-4 border-b border-slate-100">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600"><User className="w-5 h-5" /></div>
              <h2 className="text-xl font-bold text-slate-900">Confirme o Cliente</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               {dbClients.filter(c => c.id === selectedClient).map((client) => (
                <div key={client.id} className="p-4 rounded-xl border-2 border-blue-600 bg-blue-50 shadow-sm">
                  <div className="font-bold text-slate-900 mb-1">{client.name}</div>
                  <div className="text-sm text-slate-600">{client.phone}</div>
                </div>
              ))}
            </div>
            <div className="pt-4 border-t border-slate-100 flex items-start space-x-3 bg-blue-50 p-4 rounded-xl text-blue-800 text-sm">
                <AlertTriangle className="w-5 h-5 text-blue-600 flex-shrink-0" />
                <p>O cliente foi selecionado automaticamente com base no veículo. Se os dados estiverem incorretos, atualize o cadastro do cliente.</p>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="p-8 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600"><Settings className="w-5 h-5" /></div>
                <h2 className="text-xl font-bold text-slate-900">Selecione o Serviço</h2>
              </div>
              <div className="flex items-center space-x-2 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
                <span className="text-xs font-bold text-slate-500 uppercase">Chegada:</span>
                <div className="flex items-center gap-1">
                  <input 
                    type="time" 
                    value={arrivalTime} 
                    onChange={(e) => setArrivalTime(e.target.value)} 
                    className="bg-transparent text-sm font-bold text-slate-900 outline-none w-14 [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-inner-spin-button]:hidden" 
                  />
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 gap-4">
              {dbServices.map((service) => (
                <div key={service.id} onClick={() => setSelectedService(service.id)} className={`p-5 rounded-xl border-2 cursor-pointer transition-all flex items-center justify-between ${selectedService === service.id ? 'border-blue-600 bg-blue-50 shadow-sm' : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'}`}>
                  <div>
                    <div className="font-bold text-slate-900 text-lg">{service.name}</div>
                    <div className="text-sm text-slate-500 mt-1">{service.description}</div>
                  </div>
                  <div className="text-right">
                    <div className={`font-bold text-emerald-600 text-lg ${role !== 'admin' ? 'blur-finance' : ''}`}>{service.price}</div>
                    <div className="text-xs font-semibold text-slate-500 bg-white px-2 py-1 rounded-md border border-slate-200 mt-1 inline-block">~ {service.estimated_time}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-between">
          {step > 1 ? (
            <button type="button" onClick={prevStep} className="px-6 py-3 border border-slate-300 text-slate-700 rounded-xl font-bold hover:bg-white transition-colors">Voltar</button>
          ) : <div></div>}
          
          {step < 3 ? (
            <button type="button" onClick={nextStep} disabled={step === 1 && !selectedVehicle || step === 2 && !selectedClient} className="px-8 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors shadow-sm">Próximo Passo</button>
          ) : (
            <button type="button" onClick={handleSubmit} disabled={!selectedService || saving} className="px-8 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors shadow-sm flex items-center">
              <CheckCircle2 className="w-5 h-5 mr-2" />{saving ? 'Adicionando...' : 'Adicionar à Fila'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
