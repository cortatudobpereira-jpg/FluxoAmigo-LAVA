import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { Users, Shield, ShieldAlert, Search, UserPlus, X, Mail, Lock, CheckCircle2, ShieldCheck } from 'lucide-react';
import { supabase, supabaseUrl, supabaseAnonKey } from '../lib/supabase';
import { createClient } from '@supabase/supabase-js';
import { useAuth } from '../contexts/AuthContext';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Profile {
  id: string;
  full_name: string;
  email: string;
  role: 'admin' | 'user';
  created_at: string;
}

const Settings: React.FC = () => {
  const { user: currentUser, role: currentRole, loading: authLoading } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Add User State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<'admin' | 'user'>('user');
  const [addingUser, setAddingUser] = useState(false);
  const [addError, setAddError] = useState('');

  if (!authLoading && currentRole && currentRole !== 'admin') {
    return <Navigate to="/fila" replace />;
  }

  useEffect(() => {
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (data) setProfiles(data);
    setLoading(false);
  };

  const toggleRole = async (id: string, currentRole: string) => {
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    
    // Optimistic UI update
    setProfiles(prev => prev.map(p => p.id === id ? { ...p, role: newRole } : p));

    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', id);

    if (error) {
      // Revert on error
      console.error(error);
      setProfiles(prev => prev.map(p => p.id === id ? { ...p, role: currentRole as 'admin'|'user' } : p));
      alert('Erro ao atualizar permissão do usuário.');
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError('');
    setAddingUser(true);

    try {
      // A special client that doesn't persist session to avoid logging out the admin
      const secondaryClient = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false
        }
      });

      // 1. Create the Auth User
      const { data: authData, error: authError } = await secondaryClient.auth.signUp({
        email: newEmail,
        password: newPassword,
        options: {
          data: {
            full_name: newName,
            role: newRole
          }
        }
      });

      if (authError) throw authError;

      if (authData.user) {
        // 2. Ensure the Profile has the correct role (just in case trigger defaults to 'user')
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ 
            full_name: newName,
            role: newRole 
          })
          .eq('id', authData.user.id);
        
        if (profileError) console.error("Profile update error (triggers might have handled it):", profileError);

        // Success
        await fetchProfiles();
        setShowAddModal(false);
        setNewEmail('');
        setNewPassword('');
        setNewName('');
        setNewRole('user');
        alert(`Usuário "${newName}" criado com sucesso!`);
      }
    } catch (err: any) {
      setAddError(err.message || 'Erro ao criar usuário.');
    } finally {
      setAddingUser(false);
    }
  };

  const filteredProfiles = profiles.filter(p => 
    p.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center">
            <Users className="w-6 h-6 mr-3 text-blue-600" />
            Gerenciamento de Usuários
            {currentRole && (
              <span className={`ml-4 text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full border shadow-sm ${
                currentRole === 'admin' ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-100 text-slate-500 border-slate-200'
              }`}>
                Seu Perfil: {currentRole === 'admin' ? 'Admin' : 'Padrão'}
              </span>
            )}
          </h1>
          <p className="text-slate-500 text-sm mt-1">Visualize e controle as permissões de acesso ao sistema.</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-all shadow-md shadow-blue-200 flex items-center"
        >
          <UserPlus className="w-4 h-4 mr-2" />
          Novo Usuário
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input 
              type="text" 
              placeholder="Buscar usuário por nome ou e-mail..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none text-sm transition-all" 
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <table className="w-full text-left font-sans">
              <thead className="bg-white text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 font-semibold">Usuário</th>
                  <th className="px-6 py-4 font-semibold">Permissão de Acesso</th>
                  <th className="px-6 py-4 font-semibold">Data de Cadastro</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProfiles.map((profile) => (
                  <tr key={profile.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 text-blue-700 flex items-center justify-center font-bold text-sm mr-3 uppercase">
                          {profile.full_name ? profile.full_name.charAt(0) : profile.email.charAt(0)}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-sm text-slate-900">{profile.full_name || 'Usuário'}</span>
                          <span className="text-xs text-slate-500 font-medium">{profile.email}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <button 
                          onClick={() => toggleRole(profile.id, profile.role)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${profile.role === 'admin' ? 'bg-blue-600' : 'bg-slate-300'}`}
                        >
                          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${profile.role === 'admin' ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                        
                        <div className={`flex items-center px-2.5 py-1 rounded-md text-xs font-bold border ${profile.role === 'admin' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                          {profile.role === 'admin' ? (
                            <><ShieldAlert className="w-3 h-3 mr-1.5" />Administrador</>
                          ) : (
                            <><Shield className="w-3 h-3 mr-1.5" />Padrão</>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500 font-medium">
                      {profile.created_at ? format(new Date(profile.created_at), "dd 'de' MMM, yyyy", { locale: ptBR }) : '-'}
                    </td>
                  </tr>
                ))}
                {filteredProfiles.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-6 py-12 text-center text-slate-400 text-sm">
                      Nenhum usuário encontrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 text-slate-800">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 shadow-sm"><UserPlus className="w-5 h-5" /></div>
                <h3 className="text-lg font-bold">Cadastrar Novo Usuário</h3>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors p-1 hover:bg-slate-200 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            
            <form onSubmit={handleCreateUser} className="p-6 space-y-5">
              {addError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-xs font-bold animate-pulse">
                  {addError}
                </div>
              )}
              
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase flex items-center"><Users className="w-3 h-3 mr-2" />Nome Completo</label>
                <input 
                  type="text" 
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Ex: João Silva"
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all text-sm font-medium" 
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase flex items-center"><Mail className="w-3 h-3 mr-2" />E-mail de Acesso</label>
                <input 
                  type="email" 
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="usuario@email.com"
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all text-sm font-medium" 
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase flex items-center"><Lock className="w-3 h-3 mr-2" />Senha Provisória</label>
                <input 
                  type="password" 
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all text-sm font-medium" 
                  required
                  minLength={6}
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase flex items-center"><ShieldCheck className="w-3 h-3 mr-2" />Nível de Acesso</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setNewRole('user')}
                    className={`p-3 rounded-xl border-2 flex items-center justify-center space-x-2 transition-all ${
                      newRole === 'user' 
                        ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-sm' 
                        : 'border-slate-100 text-slate-500 hover:border-slate-200'
                    }`}
                  >
                    <Shield className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase">Padrão</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewRole('admin')}
                    className={`p-3 rounded-xl border-2 flex items-center justify-center space-x-2 transition-all ${
                      newRole === 'admin' 
                        ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-sm' 
                        : 'border-slate-100 text-slate-500 hover:border-slate-200'
                    }`}
                  >
                    <ShieldAlert className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase">Admin</span>
                  </button>
                </div>
              </div>

              <div className="pt-4 flex space-x-3">
                <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-3 border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition-colors">Cancelar</button>
                <button type="submit" disabled={addingUser} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  {addingUser ? 'Criando...' : 'Criar Usuário'}
                </button>
              </div>
              <p className="text-[10px] text-center text-slate-400 mt-2 italic px-4">O novo usuário poderá acessar o sistema imediatamente com o e-mail e senha configurados acima.</p>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
