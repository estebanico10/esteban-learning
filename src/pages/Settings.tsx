import { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { saveProfileLocally, type Profile } from '../lib/db';
import { ShieldAlert, Key, Check, CheckCircle2, User } from 'lucide-react';

export default function SettingsPage() {
  const { apiKey, setApiKey, profile, setProfile } = useStore();
  const [inputValue, setInputValue] = useState(apiKey || '');
  const [saved, setSaved] = useState(false);
  const [isEditing, setIsEditing] = useState(!apiKey);

  const [profileData, setProfileData] = useState<Profile>({
    id: 'user',
    name: profile?.name || 'Esteban',
    bio: profile?.bio || 'Estudiante persistente',
    targetDegree: profile?.targetDegree || 'Ingeniería / Tecnología'
  });
  const [profileSaved, setProfileSaved] = useState(false);

  useEffect(() => {
    if(profile) {
      setProfileData(profile);
    }
  }, [profile]);

  const handleSave = () => {
    setApiKey(inputValue);
    setSaved(true);
    setIsEditing(false);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleSaveProfile = async () => {
    await saveProfileLocally(profileData);
    setProfile(profileData);
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 2000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', maxWidth: '800px', paddingBottom: '60px' }}>
      <div>
        <h2 style={{ fontSize: '32px', marginBottom: '8px' }}>Configuración y Perfil</h2>
        <p style={{ color: 'var(--text-secondary)' }}>Ajusta las preferencias de tu sistema Esteban Learning y tu Perfil Personal.</p>
      </div>

      <div className="glass" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
          <User size={24} color="var(--accent-blue)" />
          <h3 style={{ fontSize: '20px' }}>Tu Perfil Personal</h3>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
           <div>
              <label style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px', display: 'block' }}>Nombre de Explorador</label>
              <input 
                type="text" 
                value={profileData.name}
                onChange={e => setProfileData({...profileData, name: e.target.value})}
                style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', padding: '12px', borderRadius: '8px', color: 'white' }}
              />
           </div>
           <div>
              <label style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px', display: 'block' }}>Ruta de Aprendizaje (Carrera / Interés Actual)</label>
              <input 
                type="text" 
                value={profileData.targetDegree}
                onChange={e => setProfileData({...profileData, targetDegree: e.target.value})}
                style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', padding: '12px', borderRadius: '8px', color: 'white' }}
              />
           </div>
           <div>
              <label style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px', display: 'block' }}>Bio (Misiones / Metas)</label>
              <textarea 
                value={profileData.bio}
                onChange={e => setProfileData({...profileData, bio: e.target.value})}
                style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', padding: '12px', borderRadius: '8px', color: 'white', minHeight: '80px' }}
              />
           </div>
           <button 
                onClick={handleSaveProfile}
                style={{
                  background: profileSaved ? 'var(--accent-green)' : 'var(--accent-blue)',
                  color: 'white',
                  padding: '12px 24px',
                  borderRadius: 'var(--radius-sm)',
                  fontWeight: 600,
                  alignSelf: 'flex-start',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'background 0.3s'
                }}
              >
                {profileSaved ? <><Check size={18} /> Perfil Guardado</> : 'Guardar Perfil'}
           </button>
        </div>
      </div>

      <div className="glass" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <ShieldAlert size={24} color="var(--accent-purple)" />
          <h3 style={{ fontSize: '20px' }}>Inteligencia Artificial (Gemini)</h3>
        </div>
        
        <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>
          Para que Esteban Learning pueda ser el mejor profesor, necesitas conectar tu propia llave de Google Gemini. 
          Por tu extrema privacidad y seguridad, yo no robaré cuentas ni contraseñas.
        </p>

        <a 
          href="https://aistudio.google.com/app/apikey" 
          target="_blank" 
          rel="noopener noreferrer"
          style={{ 
            display: 'inline-flex', 
            background: 'var(--bg-secondary)', 
            border: '1px solid var(--accent-blue)', 
            color: 'var(--accent-blue)', 
            padding: '8px 16px', 
            borderRadius: 'var(--radius-sm)', 
            fontWeight: 600, 
            marginBottom: '24px', 
            textDecoration: 'none' 
          }}
        >
          1. Toca aquí para Generar tu Clave Gratuita (Google AI Studio)
        </a>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-muted)' }}>
            2. Pega tu Llave Secreta aquí
          </label>
          
          {!isEditing ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', background: 'rgba(16, 185, 129, 0.1)', padding: '16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--accent-green)' }}>
              <CheckCircle2 color="var(--accent-green)" size={24} />
              <div style={{ flex: 1 }}>
                <h4 style={{ color: 'var(--accent-green)', fontWeight: 600 }}>Llave configurada exitosamente</h4>
                <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Tu sesión está protegida y grabada localmente.</p>
              </div>
              <button 
                onClick={() => setIsEditing(true)}
                style={{ background: 'transparent', border: '1px solid var(--accent-green)', color: 'var(--accent-green)', padding: '8px 16px', borderRadius: 'var(--radius-full)' }}>
                Cambiar Llave
              </button>
            </div>
          ) : (
             <div style={{ display: 'flex', gap: '16px' }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                background: 'rgba(0,0,0,0.5)', 
                border: '1px solid var(--border-color)', 
                borderRadius: 'var(--radius-sm)', 
                padding: '0 16px',
                flex: 1
              }}>
                <Key size={18} color="var(--text-muted)" style={{ marginRight: '12px' }} />
                <input 
                  type="password"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="AIzaSyA..."
                  style={{
                    width: '100%',
                    padding: '16px 0',
                    color: 'white'
                  }}
                />
              </div>
              <button 
                onClick={handleSave}
                style={{
                  background: saved ? 'var(--accent-green)' : 'var(--accent-blue)',
                  color: 'white',
                  padding: '0 24px',
                  borderRadius: 'var(--radius-sm)',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'background 0.3s'
                }}
              >
                {saved ? <><Check size={18} /> Guardado</> : 'Asegurar Llave'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
