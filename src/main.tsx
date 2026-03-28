import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

const isPlaceholder = (val?: string) => !val || val.includes('MY_') || val.includes('placeholder');

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const geminiApiKey = (import.meta as any).env?.GEMINI_API_KEY || (process as any).env?.GEMINI_API_KEY;

if (isPlaceholder(supabaseUrl) || isPlaceholder(supabaseAnonKey) || isPlaceholder(geminiApiKey)) {
  createRoot(document.getElementById('root')!).render(
    <div style={{
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'sans-serif',
      backgroundColor: '#f8fafc',
      padding: '2rem',
      textAlign: 'center'
    }}>
      <div style={{
        background: 'white',
        padding: '2rem',
        borderRadius: '1rem',
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
        maxWidth: '500px'
      }}>
        <h1 style={{ color: '#1e293b', marginBottom: '1rem' }}>Configuração Necessária</h1>
        <p style={{ color: '#64748b', lineHeight: '1.5', marginBottom: '1.5rem' }}>
          O projeto foi iniciado, mas você precisa configurar suas credenciais no arquivo 
          <code style={{ background: '#f1f5f9', padding: '0.2rem 0.4rem', borderRadius: '0.25rem', margin: '0 0.3rem' }}>.env.local</code> 
          para que ele funcione corretamente.
        </p>
        <div style={{ textAlign: 'left', background: '#f8fafc', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1.5rem' }}>
          <p style={{ margin: '0.5rem 0', fontWeight: 'bold' }}>Estão faltando ou são padrão:</p>
          <ul style={{ paddingLeft: '1.5rem' }}>
            {isPlaceholder(geminiApiKey) && <li style={{ color: '#ef4444' }}>GEMINI_API_KEY</li>}
            {isPlaceholder(supabaseUrl) && <li style={{ color: '#ef4444' }}>VITE_SUPABASE_URL</li>}
            {isPlaceholder(supabaseAnonKey) && <li style={{ color: '#ef4444' }}>VITE_SUPABASE_ANON_KEY</li>}
          </ul>
        </div>
        <p style={{ fontSize: '0.875rem', color: '#94a3b8' }}>
          Após editar o arquivo, o Vite reiniciará automaticamente.
        </p>
      </div>
    </div>
  );
} else {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
