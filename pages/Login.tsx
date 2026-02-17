import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Loader2, Mail, Lock, User } from 'lucide-react';

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
                // No need to set message, auth state change will redirect
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
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
            <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold text-gray-900">
                        {isSignUp ? 'Criar Conta' : 'Bem-vindo ao TripNest'}
                    </h1>
                    <p className="text-gray-500 mt-2">
                        {isSignUp ? 'Planeje suas viagens com facilidade' : 'Faça login para continuar'}
                    </p>
                </div>

                {message && (
                    <div className={`p-4 mb-6 rounded-lg text-sm ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                        }`}>
                        {message.text}
                    </div>
                )}

                <form onSubmit={handleAuth} className="space-y-4">
                    {isSignUp && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                                <input
                                    type="text"
                                    required
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                                    placeholder="Seu Nome"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                />
                            </div>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                            <input
                                type="email"
                                required
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                                placeholder="seu@email.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                    </div>

                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <label className="block text-sm font-medium text-gray-700">Senha</label>
                            {!isSignUp && (
                                <button
                                    type="button"
                                    onClick={handleForgotPassword}
                                    className="text-xs text-brand-600 hover:underline"
                                >
                                    Esqueceu a senha?
                                </button>
                            )}
                        </div>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                            <input
                                type="password"
                                required
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-brand-600 text-white py-2.5 rounded-lg font-medium hover:bg-brand-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
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
                        <div className="border-t pt-4">
                            <p className="mb-2">Ou se preferir:</p>
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
    );
}
