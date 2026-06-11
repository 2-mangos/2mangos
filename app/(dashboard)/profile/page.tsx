'use client'

import { createClient } from '../../../lib/supabase'
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { 
  User, LogOut, Save, Camera, Edit2, Crown, Loader2, 
  Upload, Mail, Phone, AtSign, CheckCircle2
} from 'lucide-react' 
import { useToast } from '../../../components/ToastContext'

export default function ProfilePage() {
  const { addToast } = useToast()

  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [uploading, setUploading] = useState(false)
  
  const [formData, setFormData] = useState({ 
    username: '', 
    email: '', 
    full_name: '', 
    phone: '', 
    avatar_url: '' 
  })
  
  const [loadingSave, setLoadingSave] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => { fetchProfile() }, [])

  async function fetchProfile() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data } = await supabase.from('users').select('*').eq('id', user.id).single()

    if (data) {
      setProfile(data)
      setFormData({ 
        username: data.username || '', 
        email: data.email || '', 
        full_name: data.full_name || '', 
        phone: data.phone || '',
        avatar_url: data.avatar_url || ''
      })
    }
    setLoading(false)
  }

  async function handleImageUpload(event: React.ChangeEvent<HTMLInputElement>) {
    try {
      setUploading(true)
      const file = event.target.files?.[0]
      if (!file) return

      const fileSizeInMB = file.size / 1024 / 1024
      if (fileSizeInMB > 2) { addToast("A imagem deve ter no máximo 2MB.", 'error'); return }
      if (!file.type.startsWith('image/')) { addToast("Apenas arquivos de imagem são permitidos.", 'error'); return }

      const fileExt = file.name.split('.').pop()
      const fileName = `${profile.id}-${Math.random()}.${fileExt}`
      const filePath = `${fileName}`

      const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file)
      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath)
      const publicUrl = urlData.publicUrl

      const { error: updateError } = await supabase.from('users').update({ avatar_url: publicUrl }).eq('id', profile.id)
      if (updateError) throw updateError

      setFormData((prev: any) => ({ ...prev, avatar_url: publicUrl }))
      setProfile((prev: any) => ({ ...prev, avatar_url: publicUrl }))
      
      addToast("Foto de perfil atualizada!", 'success')
      window.dispatchEvent(new Event('profile-updated'))
      router.refresh() 
    } catch (error: any) {
      addToast("Erro no upload: " + error.message, 'error')
    } finally {
      setUploading(false)
    }
  }

  const triggerFileInput = () => fileInputRef.current?.click()

  async function handleSaveAll() {
    if(!profile) return
    setLoadingSave(true)

    const updates = {
      full_name: formData.full_name,
      username: formData.username,
      phone: formData.phone,
      updated_at: new Date().toISOString(),
    }

    const { error } = await supabase.from('users').update(updates).eq('id', profile.id)

    if (error) {
      addToast("Erro ao atualizar: " + error.message, 'error')
    } else {
      setProfile({ ...profile, ...updates })
      setIsEditing(false)
      addToast("Perfil atualizado com sucesso!", 'success')
      window.dispatchEvent(new Event('profile-updated'))
      router.refresh()
    }
    setLoadingSave(false)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const getInitials = () => {
    const name = formData.full_name || formData.username || 'U'
    return name.substring(0, 2).toUpperCase()
  }

  if (loading) {
    return (
        <div className="flex-1 flex items-center justify-center min-h-[60vh]">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
        </div>
    )
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 sm:space-y-8 animate-in fade-in duration-500 pb-20 pt-14 md:pt-0 overflow-x-hidden">
      
      {/* =========================================================
          HEADER PADRONIZADO
      ========================================================= */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-4 border-b border-white/5">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">Meu Perfil</h1>
          <p className="text-zinc-400 mt-1 text-sm flex items-center gap-2">
             <User size={14} className="text-indigo-400"/>
             Faça a gestão dos seus dados e presença na plataforma
          </p>
        </div>
      </div>

      <div className="space-y-6 sm:space-y-8">
        
        {/* CABEÇALHO COM UPLOAD */}
        <div className="card rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left bg-zinc-900/40 border border-white/5 relative overflow-hidden">
          
          <div className="absolute top-0 left-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-[80px] pointer-events-none"></div>

          <div className="relative group cursor-pointer shrink-0 z-10" onClick={triggerFileInput}>
            <div className="h-28 w-28 rounded-full bg-indigo-600 flex items-center justify-center text-4xl font-black text-white shadow-[0_0_30px_rgba(79,70,229,0.3)] ring-4 ring-[#18181b] overflow-hidden relative transition-transform group-hover:scale-105">
              {uploading ? (
                 <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10">
                    <Loader2 size={28} className="animate-spin text-white" />
                 </div>
              ) : formData.avatar_url ? (
                 <img src={formData.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                 getInitials()
              )}
              
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                 <Camera size={24} className="text-white" />
              </div>
            </div>

            <div className="absolute bottom-0 right-0 bg-zinc-800 p-2 rounded-full border border-white/10 text-zinc-400 shadow-xl group-hover:bg-indigo-600 group-hover:text-white transition-colors group-hover:border-indigo-500/50">
               <Upload size={16} />
            </div>

            <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/png, image/jpeg, image/webp" className="hidden" />
          </div>
          
          <div className="flex-1 z-10">
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">{formData.full_name || 'Utilizador'}</h1>
            <p className="text-zinc-400 font-medium">@{formData.username}</p>
            
            <div className="mt-4 flex flex-wrap justify-center sm:justify-start gap-2">
                {profile?.plano === 'premium' ? (
                    <div className="inline-flex items-center px-3 py-1 rounded-lg text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.1)]">
                      <Crown size={14} className="mr-2 fill-emerald-400/20"/> Plano Premium
                    </div>
                ) : (
                    <div className="inline-flex items-center px-3 py-1 rounded-lg text-xs font-bold bg-zinc-800 text-zinc-400 border border-white/5 shadow-sm">
                      <User size={14} className="mr-2"/> Plano Essencial
                    </div>
                )}
            </div>
          </div>

          <button onClick={handleLogout} className="px-5 py-3 text-sm font-bold text-rose-400 hover:text-white hover:bg-rose-500 bg-rose-500/10 border border-rose-500/20 rounded-xl transition-all flex items-center gap-2 z-10 shadow-sm">
            <LogOut size={16}/> Terminar Sessão
          </button>
        </div>

        {/* DADOS PESSOAIS */}
        <div className="card rounded-3xl p-6 sm:p-8 bg-zinc-900/40 border border-white/5 relative overflow-hidden">
            <div className="absolute bottom-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-[80px] pointer-events-none"></div>

            {!isEditing && (
                <button onClick={() => setIsEditing(true)} className="absolute top-6 sm:top-8 right-6 sm:right-8 px-4 py-2 text-xs font-bold text-indigo-400 hover:text-white bg-indigo-500/10 hover:bg-indigo-600 rounded-xl transition-all border border-indigo-500/20 flex items-center gap-2 z-10">
                    <Edit2 size={14} /> <span className="hidden sm:inline">Editar Perfil</span>
                </button>
            )}

            <h2 className="text-lg font-bold text-white mb-8 flex items-center gap-3 relative z-10">
                <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400 border border-indigo-500/20">
                   <User size={18} />
                </div>
                Informações Pessoais
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 relative z-10">
                <div className="space-y-2">
                    <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Nome Completo</label>
                    <div className="relative">
                        <User size={16} className={`absolute left-4 top-1/2 -translate-y-1/2 ${isEditing ? 'text-zinc-500' : 'text-indigo-400'}`}/>
                        {isEditing ? (
                            <input type="text" value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} className="w-full rounded-xl border border-white/10 bg-zinc-900/80 p-3.5 pl-11 text-sm font-semibold text-white focus:ring-1 focus:ring-indigo-500 outline-none transition-all shadow-sm"/>
                        ) : (
                            <div className="w-full rounded-xl border border-white/5 bg-zinc-900/30 p-3.5 pl-11 text-sm font-medium text-zinc-300">{formData.full_name || 'Não definido'}</div>
                        )}
                    </div>
                </div>
                
                <div className="space-y-2">
                    <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Nome de Utilizador</label>
                    <div className="relative">
                        <AtSign size={16} className={`absolute left-4 top-1/2 -translate-y-1/2 ${isEditing ? 'text-zinc-500' : 'text-indigo-400'}`}/>
                        {isEditing ? (
                            <input type="text" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} className="w-full rounded-xl border border-white/10 bg-zinc-900/80 p-3.5 pl-11 text-sm font-semibold text-white focus:ring-1 focus:ring-indigo-500 outline-none transition-all shadow-sm"/>
                        ) : (
                            <div className="w-full rounded-xl border border-white/5 bg-zinc-900/30 p-3.5 pl-11 text-sm font-medium text-zinc-300">{formData.username}</div>
                        )}
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Telemóvel / Telefone</label>
                    <div className="relative">
                        <Phone size={16} className={`absolute left-4 top-1/2 -translate-y-1/2 ${isEditing ? 'text-zinc-500' : 'text-indigo-400'}`}/>
                        {isEditing ? (
                            <input type="text" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full rounded-xl border border-white/10 bg-zinc-900/80 p-3.5 pl-11 text-sm font-semibold text-white focus:ring-1 focus:ring-indigo-500 outline-none transition-all shadow-sm" placeholder="(00) 00000-0000"/>
                        ) : (
                            <div className="w-full rounded-xl border border-white/5 bg-zinc-900/30 p-3.5 pl-11 text-sm font-medium text-zinc-300">{formData.phone || 'Não definido'}</div>
                        )}
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="flex items-center justify-between text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                        E-mail de Acesso
                        <span className="text-[9px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded flex items-center gap-1"><CheckCircle2 size={10}/> Verificado</span>
                    </label>
                    <div className="relative cursor-not-allowed" title="Não é possível alterar o e-mail por motivos de segurança">
                        <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600"/>
                        <div className="w-full rounded-xl border border-white/5 bg-zinc-950/50 p-3.5 pl-11 text-sm font-medium text-zinc-500 opacity-80">{formData.email}</div>
                    </div>
                </div>
            </div>

            {isEditing && (
                <div className="mt-8 pt-6 border-t border-white/5 flex flex-col sm:flex-row justify-end gap-3 animate-in fade-in relative z-10">
                    <button onClick={() => setIsEditing(false)} className="w-full sm:w-auto px-6 py-3.5 text-zinc-400 hover:text-white bg-zinc-800/50 hover:bg-zinc-800 rounded-xl transition-colors text-sm font-bold border border-white/5">
                        Cancelar Alterações
                    </button>
                    <button onClick={handleSaveAll} disabled={loadingSave} className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-500 transition-all disabled:opacity-50 shadow-lg shadow-indigo-900/20 active:scale-[0.98]">
                        {loadingSave ? 'A Guardar...' : <><Save size={18} /> Guardar Perfil</>}
                    </button>
                </div>
            )}
        </div>

      </div>
    </div>
  )
}