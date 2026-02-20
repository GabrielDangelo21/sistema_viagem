import React, { useState, useRef } from 'react';
import { CurrentUser, RouteName } from '../types';
import { api } from '../services/api';
import { supabase } from '../lib/supabase';
import { Button, useToast } from '../components/UI';
import { Camera, Globe, Languages, Clock, LogOut, Save, User as UserIcon, Loader2 } from 'lucide-react';

interface ProfileProps {
    user: CurrentUser | null;
    onUserUpdate: (user: CurrentUser) => void;
    onLogout: () => void;
    onNavigate: (route: RouteName) => void;
}

const TIMEZONES = [
    { value: 'America/Sao_Paulo', label: 'Brasília (GMT-3)' },
    { value: 'America/New_York', label: 'Nova York (GMT-5)' },
    { value: 'America/Chicago', label: 'Chicago (GMT-6)' },
    { value: 'America/Denver', label: 'Denver (GMT-7)' },
    { value: 'America/Los_Angeles', label: 'Los Angeles (GMT-8)' },
    { value: 'America/Argentina/Buenos_Aires', label: 'Buenos Aires (GMT-3)' },
    { value: 'America/Bogota', label: 'Bogotá (GMT-5)' },
    { value: 'America/Mexico_City', label: 'Cidade do México (GMT-6)' },
    { value: 'Europe/London', label: 'Londres (GMT+0)' },
    { value: 'Europe/Paris', label: 'Paris (GMT+1)' },
    { value: 'Europe/Berlin', label: 'Berlim (GMT+1)' },
    { value: 'Europe/Madrid', label: 'Madrid (GMT+1)' },
    { value: 'Europe/Rome', label: 'Roma (GMT+1)' },
    { value: 'Europe/Lisbon', label: 'Lisboa (GMT+0)' },
    { value: 'Asia/Tokyo', label: 'Tóquio (GMT+9)' },
    { value: 'Asia/Dubai', label: 'Dubai (GMT+4)' },
    { value: 'Australia/Sydney', label: 'Sydney (GMT+11)' },
];

const LOCALES = [
    { value: 'pt-BR', label: 'Português (Brasil)', flag: '🇧🇷' },
    { value: 'en-US', label: 'English (US)', flag: '🇺🇸' },
    { value: 'es-ES', label: 'Español (España)', flag: '🇪🇸' },
];

export const Profile: React.FC<ProfileProps> = ({ user, onUserUpdate, onLogout, onNavigate }) => {
    const [name, setName] = useState(user?.name || '');
    const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || '');
    const [timezone, setTimezone] = useState(user?.timezone || 'America/Sao_Paulo');
    const [locale, setLocale] = useState(user?.locale || 'pt-BR');
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { toast } = useToast();

    const hasChanges =
        name !== (user?.name || '') ||
        avatarUrl !== (user?.avatarUrl || '') ||
        timezone !== (user?.timezone || 'America/Sao_Paulo') ||
        locale !== (user?.locale || 'pt-BR');

    const handleAvatarClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user) return;

        if (!file.type.startsWith('image/')) {
            toast({ message: 'Selecione uma imagem válida', type: 'error' });
            return;
        }

        if (file.size > 2 * 1024 * 1024) {
            toast({ message: 'Imagem deve ter no máximo 2MB', type: 'error' });
            return;
        }

        setUploading(true);
        try {
            const ext = file.name.split('.').pop() || 'jpg';
            const filePath = `${user.id}/avatar.${ext}`;

            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file, { upsert: true });

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            const urlWithCacheBust = `${publicUrl}?t=${Date.now()}`;
            setAvatarUrl(urlWithCacheBust);
            toast({ message: 'Foto enviada!', type: 'success' });
        } catch (err: any) {
            toast({ message: err.message || 'Erro ao enviar foto', type: 'error' });
        } finally {
            setUploading(false);
        }
    };

    const handleSave = async () => {
        if (!name.trim()) {
            toast({ message: 'Nome não pode estar vazio', type: 'error' });
            return;
        }

        setSaving(true);
        try {
            const updated = await api.updateMe({
                name: name.trim(),
                avatarUrl: avatarUrl || null,
                timezone,
                locale,
            });
            onUserUpdate({ ...updated, plan: user?.plan || 'free' });
            toast({ message: 'Perfil atualizado com sucesso!', type: 'success' });
        } catch (err: any) {
            toast({ message: err.message || 'Erro ao salvar perfil', type: 'error' });
        } finally {
            setSaving(false);
        }
    };

    const displayAvatar = avatarUrl || null;
    const planLabels: Record<string, string> = {
        free: 'Gratuito',
        pro: 'Profissional',
        family: 'Família',
    };

    return (
        <div className="p-4 md:p-8 max-w-2xl mx-auto animate-in fade-in duration-500">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-8">Meu Perfil</h1>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                {/* Avatar Section */}
                <div className="bg-gradient-to-r from-brand-500 to-brand-700 px-6 py-8 flex flex-col items-center">
                    <button
                        onClick={handleAvatarClick}
                        disabled={uploading}
                        className="relative group w-24 h-24 rounded-full overflow-hidden border-4 border-white/30 shadow-lg transition-transform hover:scale-105 active:scale-95"
                    >
                        {displayAvatar ? (
                            <img src={displayAvatar} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                            <div className="w-full h-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white text-3xl font-bold">
                                {user?.name?.charAt(0)?.toUpperCase() || '?'}
                            </div>
                        )}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            {uploading ? (
                                <Loader2 size={24} className="text-white animate-spin" />
                            ) : (
                                <Camera size={24} className="text-white" />
                            )}
                        </div>
                    </button>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleFileChange}
                    />
                    <p className="text-white/80 text-xs mt-3">Toque para alterar foto</p>

                    {/* Plan Badge */}
                    <span className="mt-3 px-3 py-1 bg-white/20 backdrop-blur-sm text-white text-xs font-bold rounded-full uppercase tracking-wider border border-white/20">
                        Plano {planLabels[user?.plan || 'free']}
                    </span>
                </div>

                {/* Form Section */}
                <div className="p-6 space-y-5">
                    {/* Name */}
                    <div>
                        <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-1.5">
                            <UserIcon size={14} className="text-gray-400" />
                            Nome
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                            placeholder="Seu nome"
                        />
                    </div>

                    {/* Email (read-only) */}
                    <div>
                        <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-1.5">
                            <span className="text-gray-400 text-xs">@</span>
                            E-mail
                        </label>
                        <input
                            type="email"
                            value={user?.email || ''}
                            disabled
                            className="w-full px-4 py-3 bg-gray-100 border border-gray-200 rounded-xl text-base text-gray-500 cursor-not-allowed"
                        />
                        <p className="text-xs text-gray-400 mt-1">O e-mail não pode ser alterado aqui.</p>
                    </div>

                    <hr className="border-gray-100" />

                    {/* Timezone */}
                    <div>
                        <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-1.5">
                            <Clock size={14} className="text-gray-400" />
                            Fuso Horário
                        </label>
                        <select
                            value={timezone}
                            onChange={(e) => setTimezone(e.target.value)}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all appearance-none"
                        >
                            {TIMEZONES.map((tz) => (
                                <option key={tz.value} value={tz.value}>
                                    {tz.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Language */}
                    <div>
                        <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-1.5">
                            <Languages size={14} className="text-gray-400" />
                            Idioma
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            {LOCALES.map((loc) => (
                                <button
                                    key={loc.value}
                                    type="button"
                                    onClick={() => setLocale(loc.value)}
                                    className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border text-sm font-medium transition-all ${locale === loc.value
                                        ? 'border-brand-500 bg-brand-50 text-brand-700 ring-2 ring-brand-500/20'
                                        : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-300'
                                        }`}
                                >
                                    <span className="text-lg">{loc.flag}</span>
                                    <span className="truncate">{loc.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="p-6 pt-0 space-y-3">
                    <Button
                        onClick={handleSave}
                        loading={saving}
                        disabled={!hasChanges}
                        className="w-full"
                        size="lg"
                    >
                        <Save size={18} className="mr-2" />
                        Salvar Alterações
                    </Button>

                    <button
                        onClick={onLogout}
                        className="w-full flex items-center justify-center gap-2 py-3 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-xl font-medium text-sm transition-colors"
                    >
                        <LogOut size={16} />
                        Sair da conta
                    </button>
                </div>
            </div>
        </div>
    );
};
