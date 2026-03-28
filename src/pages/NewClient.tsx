import React, { useState } from 'react';
import { ArrowLeft, User, Phone, Mail, MapPin, Car, CheckCircle2, Plus, Trash2 } from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface VehicleInput {
  plate: string;
  brand: string;
  model: string;
  year: string;
  color: string;
}

export default function NewClient() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const location = useLocation();
  const returnTo = new URLSearchParams(location.search).get('returnTo');
  const [loading, setLoading] = useState(false);
  const [plateErrors, setPlateErrors] = useState<Record<number, string>>({});
  
  const [clientData, setClientData] = useState({
    name: '', phone: '', address: ''
  });

  const [vehicles, setVehicles] = useState<VehicleInput[]>([
    { plate: '', brand: '', model: '', year: '', color: '' }
  ]);

  const handleClientChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    if (e.target.name === 'phone') {
      // Allow only numbers
      value = value.replace(/\D/g, '');
    }
    setClientData({ ...clientData, [e.target.name]: value });
  };

  const handleVehicleChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const updatedVehicles = [...vehicles];
    updatedVehicles[index] = { ...updatedVehicles[index], [e.target.name]: e.target.value.toUpperCase() };
    setVehicles(updatedVehicles);
    
    // Clear error when editing the plate
    if (e.target.name === 'plate' && plateErrors[index]) {
      const newErrors = { ...plateErrors };
      delete newErrors[index];
      setPlateErrors(newErrors);
    }
  };

  const addVehicle = () => {
    setVehicles([...vehicles, { plate: '', brand: '', model: '', year: '', color: '' }]);
  };

  const removeVehicle = (index: number) => {
    if (vehicles.length > 1) {
      setVehicles(vehicles.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const validVehiclesInputs = vehicles.filter(v => v.plate && v.model && v.brand);
    
    // Check for duplicate plates within the form
    const newPlateErrors: Record<number, string> = {};
    const platesInForm = vehicles.map(v => v.plate.trim().toUpperCase());
    
    let hasError = false;
    platesInForm.forEach((plate, index) => {
      if (!plate) return;
      if (platesInForm.indexOf(plate) !== index) {
        newPlateErrors[index] = 'Esta placa está duplicada no formulário';
        hasError = true;
      }
    });

    // Check if any plate already exists in the database
    const platesToSearch = platesInForm.filter(p => p !== '');
    if (platesToSearch.length > 0) {
      const { data: existingVehicles, error: checkError } = await supabase
        .from('vehicles')
        .select('plate')
        .in('plate', platesToSearch);

      if (checkError) {
        console.error(checkError);
      } else if (existingVehicles && existingVehicles.length > 0) {
        const existingPlates = existingVehicles.map(v => v.plate);
        platesInForm.forEach((plate, index) => {
          if (existingPlates.includes(plate)) {
            newPlateErrors[index] = 'Placa já cadastrada no sistema';
            hasError = true;
          }
        });
      }
    }

    if (hasError) {
      setPlateErrors(newPlateErrors);
      setLoading(false);
      return;
    }

    // 1. Insert Client
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .insert({
        user_id: user!.id,
        name: clientData.name,
        phone: clientData.phone,
        address: clientData.address,
      })
      .select()
      .single();

    if (clientError || !client) {
      console.error(clientError);
      setLoading(false);
      return;
    }

    // 2. Insert Vehicles
    const validVehicles = validVehiclesInputs.map(v => ({
      ...v,
      client_id: client.id,
      user_id: user!.id
    }));

    if (validVehicles.length > 0) {
      await supabase.from('vehicles').insert(validVehicles);
    }

    if (returnTo) {
      navigate(returnTo, { state: { newClientId: client.id } });
    } else {
      navigate(`/clientes/${client.id}`);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center space-x-4">
        <Link to={returnTo || "/clientes"} className="p-2 bg-white border border-slate-200 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-colors shadow-sm"><ArrowLeft className="w-5 h-5" /></Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Novo Cliente</h1>
          <p className="text-slate-500 text-sm">Cadastre os dados pessoais e veículos do cliente.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Dados Pessoais */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center">
            <User className="w-5 h-5 text-blue-600 mr-2" />
            <h2 className="text-lg font-bold text-slate-900">Dados Pessoais</h2>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-bold text-slate-700">Nome Completo *</label>
              <input type="text" name="name" value={clientData.name} onChange={handleClientChange} className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all bg-slate-50 focus:bg-white" required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 flex items-center"><Phone className="w-4 h-4 mr-1.5 text-slate-400" />Telefone/WhatsApp *</label>
              <input type="tel" name="phone" value={clientData.phone} onChange={handleClientChange} placeholder="Apenas números (DDD + Número)" className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all bg-slate-50 focus:bg-white" required />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-bold text-slate-700 flex items-center"><MapPin className="w-4 h-4 mr-1.5 text-slate-400" />Endereço Completo</label>
              <input type="text" name="address" value={clientData.address} onChange={handleClientChange} className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all bg-slate-50 focus:bg-white" />
            </div>
          </div>
        </div>

        {/* Veículos */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <div className="flex items-center">
              <Car className="w-5 h-5 text-blue-600 mr-2" />
              <h2 className="text-lg font-bold text-slate-900">Veículos</h2>
            </div>
            <button type="button" onClick={addVehicle} className="text-sm font-semibold text-blue-600 hover:text-blue-700 flex items-center">
              <Plus className="w-4 h-4 mr-1" /> Adicionar Veículo
            </button>
          </div>
          
          <div className="p-6 space-y-6">
            {vehicles.map((vehicle, index) => (
              <div key={index} className="relative p-6 border border-slate-200 rounded-xl bg-slate-50/50">
                {vehicles.length > 1 && (
                  <button type="button" onClick={() => removeVehicle(index)} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Placa *</label>
                    <input type="text" name="plate" value={vehicle.plate} onChange={(e) => handleVehicleChange(index, e)} placeholder="ABC-1234" className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all bg-white uppercase font-mono ${plateErrors[index] ? 'border-red-300 ring-2 ring-red-50' : 'border-slate-300'}`} required />
                    {plateErrors[index] && (
                      <p className="text-[10px] font-semibold text-red-500 mt-1">{plateErrors[index]}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Marca *</label>
                    <input type="text" name="brand" value={vehicle.brand} onChange={(e) => handleVehicleChange(index, e)} placeholder="Ex: VW, Fiat" className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all bg-white" required />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Modelo *</label>
                    <input type="text" name="model" value={vehicle.model} onChange={(e) => handleVehicleChange(index, e)} placeholder="Ex: Gol, Palio" className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all bg-white" required />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Ano</label>
                    <input type="text" name="year" value={vehicle.year} onChange={(e) => handleVehicleChange(index, e)} placeholder="Ex: 2020" className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all bg-white" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Cor</label>
                    <input type="text" name="color" value={vehicle.color} onChange={(e) => handleVehicleChange(index, e)} placeholder="Ex: Prata" className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all bg-white" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end space-x-4">
          <Link to={returnTo || "/clientes"} className="px-6 py-3 border border-slate-300 text-slate-700 rounded-xl font-bold hover:bg-slate-50 transition-colors shadow-sm">Cancelar</Link>
          <button type="submit" disabled={loading} className="px-8 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 disabled:bg-blue-400 transition-colors shadow-sm flex items-center">
            <CheckCircle2 className="w-5 h-5 mr-2" />{loading ? 'Salvando...' : 'Cadastrar Cliente'}
          </button>
        </div>
      </form>
    </div>
  );
}
