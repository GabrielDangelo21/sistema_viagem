import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Loader2, Mail, Lock, User, MapPin, ShieldCheck } from 'lucide-react';

interface LoginProps {
    mfaChallengeMode?: boolean;
    onSuccess?: () => void;
}

export function Login({ mfaChallengeMode = false, onSuccess }: LoginProps = {}) {
    const [isSignUp, setIsSignUp] = useState(false);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const [mfaCode, setMfaCode] = useState('');
    const [factorId, setFactorId] = useState<string | null>(null);

    React.useEffect(() => {
        if (mfaChallengeMode) {
            supabase.auth.mfa.listFactors().then(({ data }) => {
                if (data?.totp && data.totp.length > 0) {
                    setFactorId(data.totp[0].id);
                } else if (data?.all && data.all.length > 0) {
                    setFactorId(data.all[0].id);
                }
            });
        }
    }, [mfaChallengeMode]);

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);

        try {
            if (isSignUp) {
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: { name },
                    },
                });
                if (error) throw error;
                setMessage({ type: 'success', text: 'Conta criada! Verifique seu e-mail para confirmar.' });
            } else {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;
            }
        } catch (error: any) {
            setMessage({ type: 'error', text: error.message || 'Erro na autenticação.' });
        } finally {
            setLoading(false);
        }
    };

    const handleMagicLink = async () => {
        setLoading(true);
        setMessage(null);
        try {
            const { error } = await supabase.auth.signInWithOtp({
                email,
                options: { emailRedirectTo: window.location.origin },
            });
            if (error) throw error;
            setMessage({ type: 'success', text: 'Link enviado! Verifique seu e-mail.' });
        } catch (error: any) {
            setMessage({ type: 'error', text: error.message });
        } finally {
            setLoading(false);
        }
    };

    const handleMfaVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);
        try {
            if (!factorId) throw new Error('Nenhum fator MFA encontrado para esta conta.');

            const challenge = await supabase.auth.mfa.challenge({ factorId });
            if (challenge.error) throw challenge.error;

            const verify = await supabase.auth.mfa.verify({
                factorId,
                challengeId: challenge.data.id,
                code: mfaCode
            });
            if (verify.error) throw verify.error;

            if (onSuccess) onSuccess();
        } catch (error: any) {
            setMessage({ type: 'error', text: error.message || 'Código inválido.' });
        } finally {
            setLoading(false);
        }
    };

    const handleForgotPassword = async () => {
        if (!email) {
            setMessage({ type: 'error', text: 'Digite seu e-mail primeiro.' });
            return;
        }
        setLoading(true);
        setMessage(null);
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/reset-password`,
            });
            if (error) throw error;
            setMessage({ type: 'success', text: 'E-mail de recuperação enviado!' });
        } catch (error: any) {
            setMessage({ type: 'error', text: error.message });
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        setLoading(true);
        setMessage(null);
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: window.location.origin,
                },
            });
            if (error) throw error;
        } catch (error: any) {
            setMessage({ type: 'error', text: error.message || 'Erro ao conectar com Google.' });
            setLoading(false);
        }
    };

    return (
        <div className="min-h-[100dvh] flex items-center justify-center bg-gradient-to-br from-brand-600 via-brand-500 to-sky-400 p-4 sm:p-6">
            <div className="w-full max-w-md">
                {/* Logo / Brand */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl mb-4">
                        <MapPin className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">TripNest</h1>
                    <p className="text-white/70 text-sm mt-1">Planeje viagens inesquecíveis</p>
                </div>

                {/* Card */}
                <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl shadow-brand-900/20 p-6 sm:p-8">
                    <div className="text-center mb-6">
                        <h2 className="text-xl font-bold text-gray-900">
                            {isSignUp ? 'Criar Conta' : 'Bem-vindo de volta'}
                        </h2>
                        <p className="text-gray-500 text-sm mt-1">
                            {mfaChallengeMode ? 'Digite o código do seu aplicativo autenticador' : isSignUp ? 'Crie sua conta em segundos' : 'Faça login para continuar'}
                        </p>
                    </div>

                    {message && (
                        <div className={`p-3 mb-5 rounded-xl text-sm font-medium ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                            }`}>
                            {message.text}
                        </div>
                    )}

                    {mfaChallengeMode ? (
                        <form onSubmit={handleMfaVerify} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Código de Autenticação (6 dígitos)</label>
                                <div className="relative">
                                    <ShieldCheck className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                                    <input
                                        type="text"
                                        required
                                        maxLength={6}
                                        className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 outline-none transition-all tracking-widest text-center text-lg shadow-sm"
                                        placeholder="000000"
                                        value={mfaCode}
                                        onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))}
                                    />
                                </div>
                            </div>
                            <button
                                type="submit"
                                disabled={loading || mfaCode.length !== 6}
                                className="w-full bg-brand-600 text-white py-3.5 rounded-xl font-semibold hover:bg-brand-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm shadow-brand-300 active:scale-[0.98]"
                            >
                                {loading && <Loader2 className="w-5 h-5 animate-spin" />}
                                Verificar Código
                            </button>
                            <button
                                type="button"
                                onClick={() => supabase.auth.signOut()}
                                className="w-full mt-2 py-3 text-red-500 hover:text-red-600 bg-red-50/50 hover:bg-red-50 rounded-xl font-medium text-sm transition-colors"
                            >
                                Cancelar e Sair
                            </button>
                        </form>
                    ) : (
                        <>
                            <form onSubmit={handleAuth} className="space-y-4">
                                {isSignUp && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Nome</label>
                                        <div className="relative">
                                            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                                            <input
                                                type="text"
                                                required
                                                className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 outline-none transition-all"
                                                placeholder="Seu Nome"
                                                value={name}
                                                onChange={(e) => setName(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">E-mail</label>
                                    <div className="relative">
                                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                                        <input
                                            type="email"
                                            required
                                            className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 outline-none transition-all"
                                            placeholder="seu@email.com"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <div className="flex justify-between items-center mb-1.5">
                                        <label className="block text-sm font-medium text-gray-700">Senha</label>
                                        {!isSignUp && (
                                            <button
                                                type="button"
                                                onClick={handleForgotPassword}
                                                className="text-xs text-brand-600 hover:underline font-medium"
                                            >
                                                Esqueceu a senha?
                                            </button>
                                        )}
                                    </div>
                                    <div className="relative">
                                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                                        <input
                                            type="password"
                                            required
                                            className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 outline-none transition-all"
                                            placeholder="••••••••"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full bg-brand-600 text-white py-3.5 rounded-xl font-semibold hover:bg-brand-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm shadow-brand-300 active:scale-[0.98]"
                                >
                                    {loading && <Loader2 className="w-5 h-5 animate-spin" />}
                                    {isSignUp ? 'Criar Conta' : 'Entrar'}
                                </button>
                            </form>

                            {/* Divider */}
                            <div className="relative my-6">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-gray-200" />
                                </div>
                                <div className="relative flex justify-center text-xs">
                                    <span className="px-3 bg-white/95 text-gray-400">ou continue com</span>
                                </div>
                            </div>

                            {/* Google Login */}
                            <button
                                type="button"
                                onClick={handleGoogleLogin}
                                disabled={loading}
                                className="w-full flex items-center justify-center gap-3 py-3.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 font-medium transition-all disabled:opacity-50 active:scale-[0.98] shadow-sm"
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24">
                                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                                </svg>
                                Continuar com Google
                            </button>

                            <div className="mt-6 text-center text-sm text-gray-600">
                                <p className="mb-4">
                                    {isSignUp ? 'Já tem uma conta?' : 'Não tem conta?'}
                                    <button
                                        onClick={() => setIsSignUp(!isSignUp)}
                                        className="text-brand-600 font-semibold ml-1 hover:underline"
                                    >
                                        {isSignUp ? 'Fazer Login' : 'Criar agora'}
                                    </button>
                                </p>

                                {!isSignUp && (
                                    <div className="border-t border-gray-100 pt-4">
                                        <p className="mb-2 text-gray-400 text-xs">Ou se preferir:</p>
                                        <button
                                            type="button"
                                            onClick={handleMagicLink}
                                            disabled={loading || !email}
                                            className="text-gray-500 hover:text-brand-600 text-xs underline disabled:opacity-50"
                                        >
                                            Enviar Link Mágico por E-mail
                                        </button>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
