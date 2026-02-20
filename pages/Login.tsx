import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Loader2, Mail, Lock, User, MapPin } from 'lucide-react';

export function Login() {
    const [isSignUp, setIsSignUp] = useState(false);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

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
                            {isSignUp ? 'Crie sua conta em segundos' : 'Faça login para continuar'}
                        </p>
                    </div>

                    {message && (
                        <div className={`p-3 mb-5 rounded-xl text-sm font-medium ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                            }`}>
                            {message.text}
                        </div>
                    )}

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
                </div>
            </div>
        </div>
    );
}
