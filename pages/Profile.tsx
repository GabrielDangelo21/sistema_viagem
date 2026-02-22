import React, { useState, useRef, useEffect } from 'react';
import { CurrentUser, RouteName } from '../types';
import { api } from '../services/api';
import { supabase } from '../lib/supabase';
import { Button, useToast } from '../components/UI';
import { Camera, Globe, Languages, Clock, LogOut, Save, User as UserIcon, Loader2, Key, ShieldAlert, ShieldCheck, Mail, Trash2, X, AlertTriangle } from 'lucide-react';

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

    // Auth Advanced State
    const [email, setEmail] = useState(user?.email || '');
    const [isEditingEmail, setIsEditingEmail] = useState(false);

    const [newPassword, setNewPassword] = useState('');
    const [isEditingPassword, setIsEditingPassword] = useState(false);

    const [isEnrolledMfa, setIsEnrolledMfa] = useState(false);
    const [showMfaSetup, setShowMfaSetup] = useState(false);
    const [mfaQrCode, setMfaQrCode] = useState('');
    const [mfaSecret, setMfaSecret] = useState('');
    const [mfaVerifyCode, setMfaVerifyCode] = useState('');
    const [factorId, setFactorId] = useState('');

    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { toast } = useToast();

    useEffect(() => {
        // Obter status de MFA ao carregar a página
        supabase.auth.mfa.listFactors().then(({ data }) => {
            if (data?.totp && data.totp.length > 0) {
                const enrolled = data.totp.find(f => f.status === 'verified');
                if (enrolled) setIsEnrolledMfa(true);
            }
        });
    }, []);

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

    // --- SECURE SYSTEM ACTIONS ---

    const handleUpdateEmail = async () => {
        if (email === user?.email) return setIsEditingEmail(false);
        if (!email.trim() || !email.includes('@')) {
            toast({ message: 'Um e-mail válido é obrigatório', type: 'error' });
            return;
        }
        setSaving(true);
        try {
            const { error } = await supabase.auth.updateUser({ email });
            if (error) throw error;
            toast({ message: 'Verifique ambos os e-mails (antigo e novo) para confirmar a alteração de endereço.', type: 'success' });
            setIsEditingEmail(false);
        } catch (err: any) {
            toast({ message: err.message || 'Erro ao atualizar e-mail', type: 'error' });
        } finally {
            setSaving(false);
        }
    };

    const handleUpdatePassword = async () => {
        if (!newPassword || newPassword.length < 6) {
            toast({ message: 'A nova senha deve ter no mínimo 6 caracteres', type: 'error' });
            return;
        }
        setSaving(true);
        try {
            const { error } = await supabase.auth.updateUser({ password: newPassword });
            if (error) throw error;
            toast({ message: 'Senha atualizada com sucesso!', type: 'success' });
            setIsEditingPassword(false);
            setNewPassword('');
        } catch (err: any) {
            toast({ message: err.message || 'Erro ao atualizar senha', type: 'error' });
        } finally {
            setSaving(false);
        }
    };

    const handleSetupMfa = async () => {
        setSaving(true);
        try {
            // Limpa fatores não verificados anteriores para evitar erro 422
            const { data: factors } = await supabase.auth.mfa.listFactors();
            if (factors?.totp) {
                const unverified = factors.totp.filter(f => (f.status as string) === 'unverified');
                for (const f of unverified) {
                    await supabase.auth.mfa.unenroll({ factorId: f.id });
                }
            }

            const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp' });
            if (error) throw error;
            setFactorId(data.id);
            setMfaQrCode(data.totp.qr_code);
            setMfaSecret(data.totp.secret);
            setShowMfaSetup(true);
        } catch (err: any) {
            toast({ message: err.message || 'Erro ao iniciar MFA', type: 'error' });
        } finally {
            setSaving(false);
        }
    };

    const handleVerifyMfa = async () => {
        if (mfaVerifyCode.length !== 6) return;
        setSaving(true);
        try {
            const challenge = await supabase.auth.mfa.challenge({ factorId });
            if (challenge.error) throw challenge.error;
            const verify = await supabase.auth.mfa.verify({
                factorId,
                challengeId: challenge.data.id,
                code: mfaVerifyCode
            });
            if (verify.error) throw verify.error;
            toast({ message: 'Autenticação de Dois Fatores ativada!', type: 'success' });
            setIsEnrolledMfa(true);
            setShowMfaSetup(false);
            setMfaVerifyCode('');
        } catch (err: any) {
            toast({ message: err.message || 'Código de verificação inválido', type: 'error' });
        } finally {
            setSaving(false);
        }
    };

    const handleUnenrollMfa = async () => {
        setSaving(true);
        try {
            const { data } = await supabase.auth.mfa.listFactors();
            const factor = data?.totp.find(f => f.status === 'verified');
            if (factor) {
                const { error } = await supabase.auth.mfa.unenroll({ factorId: factor.id });
                if (error) throw error;
                toast({ message: 'Autenticação de Dois Fatores desativada.', type: 'success' });
                setIsEnrolledMfa(false);
            }
        } catch (err: any) {
            toast({ message: err.message || 'Erro ao desativar MFA', type: 'error' });
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteAccount = async () => {
        setSaving(true);
        try {
            await api.deleteMe();
            await supabase.auth.signOut();
            // User gets logged out and redirected natively by state machine.
        } catch (error: any) {
            toast({ message: error.message || 'Erro ao excluir a conta', type: 'error' });
            setSaving(false);
            setShowDeleteConfirm(false);
        }
    };

    const displayAvatar = avatarUrl || null;
    const planLabels: Record<string, string> = {
        free: 'Gratuito',
        pro: 'Profissional',
        family: 'Família',
    };

    return (
        <div className="p-4 md:p-8 max-w-2xl mx-auto animate-in fade-in duration-500 pb-20">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-8">Meu Perfil</h1>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-8">
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
                        Salvar Preferências
                    </Button>
                </div>
            </div>

            {/* Configurações de Segurança e Acesso */}
            <h2 className="text-lg font-bold text-gray-900 mb-4 ml-1 flex items-center gap-2">
                <ShieldCheck className="text-brand-500" size={20} /> Segurança e Acesso
            </h2>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-8 divide-y divide-gray-100">
                {/* Alterar Email */}
                <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3 className="text-base font-bold text-gray-900">Endereço de E-mail</h3>
                            <p className="text-sm text-gray-500">Seu e-mail atual é {user?.email}</p>
                        </div>
                        <button
                            onClick={() => {
                                setIsEditingEmail(!isEditingEmail);
                                setEmail(user?.email || '');
                            }}
                            className="bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg text-sm font-semibold hover:bg-gray-200 transition-colors"
                        >
                            {isEditingEmail ? 'Cancelar' : 'Alterar'}
                        </button>
                    </div>

                    {isEditingEmail && (
                        <div className="flex flex-col sm:flex-row gap-3 pt-2">
                            <div className="relative flex-1">
                                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                                <input
                                    type="email"
                                    className="w-full pl-11 pr-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 outline-none transition-all"
                                    placeholder="Novo endereço de e-mail"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>
                            <Button onClick={handleUpdateEmail} loading={saving}>Atualizar E-mail</Button>
                        </div>
                    )}
                </div>

                {/* Alterar Senha */}
                <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3 className="text-base font-bold text-gray-900">Mudar Senha</h3>
                            <p className="text-sm text-gray-500">Altere sua senha de acesso a qualquer momento</p>
                        </div>
                        <button
                            onClick={() => {
                                setIsEditingPassword(!isEditingPassword);
                                setNewPassword('');
                            }}
                            className="bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg text-sm font-semibold hover:bg-gray-200 transition-colors"
                        >
                            {isEditingPassword ? 'Cancelar' : 'Alterar'}
                        </button>
                    </div>

                    {isEditingPassword && (
                        <div className="flex flex-col sm:flex-row gap-3 pt-2">
                            <div className="relative flex-1">
                                <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                                <input
                                    type="password"
                                    className="w-full pl-11 pr-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 outline-none transition-all"
                                    placeholder="Digite a nova senha"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                />
                            </div>
                            <Button onClick={handleUpdatePassword} loading={saving}>Redefinir Senha</Button>
                        </div>
                    )}
                </div>

                {/* MFA */}
                <div className="p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                                Autenticação de 2 Fatores (2FA)
                                {isEnrolledMfa && <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-bold rounded-full">Ativo</span>}
                            </h3>
                            <p className="text-sm text-gray-500 mt-1">
                                Proteja sua conta exigindo um código de um app autenticador ao fazer login.
                            </p>
                        </div>
                        {isEnrolledMfa ? (
                            <button
                                onClick={handleUnenrollMfa}
                                disabled={saving}
                                className="bg-red-50 text-red-600 px-3 py-1.5 rounded-lg text-sm font-semibold hover:bg-red-100 transition-colors"
                            >
                                Desativar
                            </button>
                        ) : (
                            !showMfaSetup && (
                                <button
                                    onClick={handleSetupMfa}
                                    disabled={saving}
                                    className="bg-brand-50 text-brand-700 px-3 py-1.5 rounded-lg text-sm font-semibold hover:bg-brand-100 transition-colors"
                                >
                                    Configurar
                                </button>
                            )
                        )}
                    </div>

                    {showMfaSetup && !isEnrolledMfa && (
                        <div className="mt-6 bg-gray-50 rounded-xl p-6 border border-gray-200">
                            <div className="flex items-center justify-between mb-4">
                                <h4 className="font-bold text-gray-800">Complete a Configuração</h4>
                                <button onClick={() => setShowMfaSetup(false)} className="text-gray-400 hover:text-gray-600">
                                    <X size={20} />
                                </button>
                            </div>
                            <p className="text-sm text-gray-600 mb-4">
                                1. Escaneie o QR Code abaixo com seu aplicativo autenticador (ex: Google Authenticator, Authy).
                            </p>
                            <div className="flex justify-center mb-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-center">
                                <div dangerouslySetInnerHTML={{ __html: mfaQrCode.replace(/^data:image\/svg\+xml;utf-8,/, '') }} className="w-48 h-48 [&>svg]:w-full [&>svg]:h-full" />
                            </div>
                            <p className="text-xs text-gray-500 text-center mb-6">Também pode usar o código: <strong className="font-mono bg-gray-200 px-1 rounded text-gray-800">{mfaSecret}</strong></p>

                            <p className="text-sm text-gray-600 mb-2">
                                2. Digite o código de 6 dígitos gerado pelo aplicativo
                            </p>
                            <div className="flex gap-3">
                                <input
                                    type="text"
                                    maxLength={6}
                                    value={mfaVerifyCode}
                                    onChange={(e) => setMfaVerifyCode(e.target.value.replace(/\D/g, ''))}
                                    placeholder="000000"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg tracking-widest text-center text-lg"
                                />
                                <Button onClick={handleVerifyMfa} loading={saving} disabled={mfaVerifyCode.length !== 6}>Verificar</Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Zona de Perigo */}
            <div className="mt-12 bg-red-50/50 rounded-2xl border border-red-100 overflow-hidden">
                <div className="p-6 flex flex-col items-center text-center gap-4">
                    <div>
                        <h3 className="text-base font-bold text-red-700 flex items-center justify-center gap-2">
                            <ShieldAlert size={18} /> Excluir Conta Definitivamente
                        </h3>
                        <p className="text-sm text-red-600/80 mt-1">Ao excluir sua conta, todas as suas viagens e dados serão apagados para sempre. Esta ação não pode ser desfeita.</p>
                    </div>

                    {!showDeleteConfirm ? (
                        <button
                            onClick={() => setShowDeleteConfirm(true)}
                            className="bg-white text-red-600 border border-red-200 px-4 py-2 rounded-lg text-sm font-bold hover:bg-red-50 hover:border-red-300 transition-colors whitespace-nowrap shadow-sm"
                        >
                            Excluir Minha Conta
                        </button>
                    ) : (
                        <div className="flex flex-col gap-2 w-full sm:w-auto">
                            <span className="text-xs font-bold text-red-800 flex items-center gap-1">
                                <AlertTriangle size={12} /> Tem certeza absoluta?
                            </span>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setShowDeleteConfirm(false)}
                                    className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-200 transition-colors flex-1 text-center"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleDeleteAccount}
                                    disabled={saving}
                                    className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-red-700 transition-colors flex-1 flex justify-center items-center shadow-lg shadow-red-600/20"
                                >
                                    {saving ? <Loader2 size={16} className="animate-spin" /> : 'Sim, Excluir'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="mt-8">
                <button
                    onClick={onLogout}
                    className="w-full flex items-center justify-center gap-2 py-4 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl font-bold transition-colors"
                >
                    <LogOut size={16} />
                    Sair da conta
                </button>
            </div>
        </div>
    );
};
