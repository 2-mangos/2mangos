'use client'

import { createClient } from '../../../lib/supabase'
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { User, LogOut, Save, Camera, Edit2, Crown, Loader2, Upload } from 'lucide-react' 
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

  // --- LÓGICA DE UPLOAD DE IMAGEM ---
  async function handleImageUpload(event: React.ChangeEvent<HTMLInputElement>) {
    try {
      setUploading(true)
      const file = event.target.files?.[0]
      
      if (!file) return

      // 1. Validação de Tamanho (Max 2MB)
      const fileSizeInMB = file.size / 1024 / 1024
      if (fileSizeInMB > 2) {
        addToast("A imagem deve ter no máximo 2MB.", 'error')
        return
      }

      // 2. Validação de Tipo
      if (!file.type.startsWith('image/')) {
        addToast("Apenas arquivos de imagem são permitidos.", 'error')
        return
      }

      const fileExt = file.name.split('.').pop()
      const fileName = `${profile.id}-${Math.random()}.${fileExt}`
      const filePath = `${fileName}`

      // 3. Upload para o Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      // 4. Obter URL Pública
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)

      const publicUrl = urlData.publicUrl

      // 5. Atualizar Tabela de Usuários
      const { error: updateError } = await supabase
        .from('users')
        .update({ avatar_url: publicUrl })
        .eq('id', profile.id)

      if (updateError) throw updateError

      // 6. Atualizar Estado Local
      setFormData((prev: any) => ({ ...prev, avatar_url: publicUrl }))
      setProfile((prev: any) => ({ ...prev, avatar_url: publicUrl }))
      
      addToast("Foto de perfil atualizada!", 'success')
      
      // AVISAR O HEADER PARA ATUALIZAR
      window.dispatchEvent(new Event('profile-updated'))
      
      router.refresh() 

    } catch (error: any) {
      addToast("Erro no upload: " + error.message, 'error')
    } finally {
      setUploading(false)
    }
  }

  const triggerFileInput = () => {
    fileInputRef.current?.click()
  }

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
      
      // AVISAR O HEADER PARA ATUALIZAR (Caso mude o nome)
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

  if (loading) return <div className="p-8 text-center text-zinc-500">Carregando...</div>

  return (
    <div className="min-h-screen p-8 pb-32 animate-in fade-in duration-500">
      <div className="mx-auto max-w-3xl space-y-6">
        
        {/* CABEÇALHO COM UPLOAD */}
        <div className="card rounded-2xl p-8 flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left">
          
          <div className="relative group cursor-pointer" onClick={triggerFileInput}>
            <div className="h-24 w-24 rounded-full bg-indigo-600 flex items-center justify-center text-3xl font-bold text-white shadow-xl ring-4 ring-zinc-950 overflow-hidden relative">
              {uploading ? (
                 <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10">
                    <Loader2 size={24} className="animate-spin text-white" />
                 </div>
              ) : formData.avatar_url ? (
                 <img src={formData.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                 getInitials()
              )}
              
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                 <Camera size={20} className="text-white" />
              </div>
            </div>

            <div className="absolute bottom-0 right-0 bg-zinc-800 p-1.5 rounded-full border border-white/10 text-zinc-400 shadow-sm group-hover:bg-indigo-600 group-hover:text-white transition-colors">
               <Upload size={14} />
            </div>

            <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleImageUpload} 
                accept="image/png, image/jpeg, image/webp" 
                className="hidden" 
            />
          </div>
          
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-white">{formData.full_name || 'Usuário'}</h1>
            <p className="text-zinc-400">@{formData.username}</p>
            
            {profile?.plano === 'premium' ? (
                <div className="mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                  <Crown size={12} className="mr-1.5 fill-emerald-400/20"/> Premium
                </div>
            ) : (
                <div className="mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-zinc-500/10 text-zinc-400 border border-zinc-500/20">
                  <User size={12} className="mr-1.5"/> Free
                </div>
            )}
          </div>

          <button onClick={handleLogout} className="px-4 py-2 text-sm font-medium text-red-400 hover:bg-red-500/10 border border-red-500/10 rounded-xl transition-colors flex items-center gap-2">
            <LogOut size={16}/> Sair
          </button>
        </div>

        {/* DADOS PESSOAIS */}
        <div className="card rounded-2xl p-8 relative">
            {!isEditing && (
                <button onClick={() => setIsEditing(true)} className="absolute top-6 right-6 p-2 text-zinc-500 hover:text-white hover:bg-white/5 rounded-full transition-colors" title="Editar Perfil">
                    <Edit2 size={20} />
                </button>
            )}

            <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                <User size={20} className="text-indigo-500"/> Informações Pessoais
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Nome Completo</label>
                    {isEditing ? (
                        <input type="text" value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} className="w-full rounded-xl border border-white/10 bg-zinc-950 p-3 text-sm text-white focus:ring-2 focus:ring-indigo-500 outline-none"/>
                    ) : (
                        <p className="text-zinc-300 font-medium text-sm py-2 border-b border-white/5">{formData.full_name || '-'}</p>
                    )}
                </div>
                <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Usuário</label>
                    {isEditing ? (
                        <input type="text" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} className="w-full rounded-xl border border-white/10 bg-zinc-950 p-3 text-sm text-white focus:ring-2 focus:ring-indigo-500 outline-none"/>
                    ) : (
                        <p className="text-zinc-300 font-medium text-sm py-2 border-b border-white/5">@{formData.username}</p>
                    )}
                </div>
                <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Telefone</label>
                    {isEditing ? (
                        <input type="text" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full rounded-xl border border-white/10 bg-zinc-950 p-3 text-sm text-white focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="(00) 00000-0000"/>
                    ) : (
                        <p className="text-zinc-300 font-medium text-sm py-2 border-b border-white/5">{formData.phone || '-'}</p>
                    )}
                </div>
                <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">E-mail</label>
                    {/* Email não editável para segurança simples */}
                    <p className="text-zinc-300 font-medium text-sm py-2 border-b border-white/5 opacity-70 cursor-not-allowed" title="Não é possível alterar o e-mail">{formData.email}</p>
                </div>
            </div>

            {isEditing && (
                <div className="mt-8 flex justify-end gap-3">
                    <button onClick={() => setIsEditing(false)} className="px-4 py-2 text-zinc-400 hover:text-white transition-colors text-sm font-medium">Cancelar</button>
                    <button onClick={handleSaveAll} disabled={loadingSave} className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-500 transition-all disabled:opacity-50">
                        {loadingSave ? 'Salvando...' : <><Save size={18} /> Salvar</>}
                    </button>
                </div>
            )}
        </div>

      </div>
    </div>
  )
}