import React, { useState } from 'react';
import { RouteName } from '../types';
import { Button } from '../components/UI';
import { Check, Crown, Users, Zap, Shield, HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';

interface UpgradeProps {
  onNavigate: (route: RouteName) => void;
}

export const Upgrade: React.FC<UpgradeProps> = ({ onNavigate }) => {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const faqs = [
    {
      q: "Posso cancelar quando quiser?",
      a: "Sim. Você pode cancelar a assinatura a qualquer momento através das configurações da sua conta. O acesso premium continuará até o fim do ciclo de cobrança."
    },
    {
      q: "Minhas viagens ficam salvas no plano grátis?",
      a: "Sim, todas as suas viagens concluídas ficam salvas no histórico como 'Arquivo', independente do plano. O limite do plano grátis se aplica apenas a viagens ativas simultâneas."
    },
    {
      q: "Posso mudar de plano depois?",
      a: "Com certeza. Você pode fazer upgrade ou downgrade a qualquer momento. Se fizer upgrade, o valor será ajustado proporcionalmente."
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header Section */}
      <div className="pt-12 pb-10 px-4 text-center space-y-4 max-w-4xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 tracking-tight">
          Escolha o plano ideal para sua jornada
        </h1>
        <p className="text-lg text-gray-500 max-w-2xl mx-auto">
          Desbloqueie todo o potencial do TripNest e viaje com tranquilidade.
        </p>
        
        {/* Trust Microcopy */}
        <div className="flex flex-wrap justify-center items-center gap-x-6 gap-y-2 text-xs md:text-sm font-medium text-gray-400 mt-4 uppercase tracking-wide">
          <span className="flex items-center gap-1.5"><Shield size={14} /> Cancele quando quiser</span>
          <span className="hidden md:inline">•</span>
          <span className="flex items-center gap-1.5"><Check size={14} /> Sem taxas ocultas</span>
          <span className="hidden md:inline">•</span>
          <span className="flex items-center gap-1.5"><HelpCircle size={14} /> Suporte por e-mail</span>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="max-w-6xl mx-auto px-4 grid md:grid-cols-3 gap-8 items-start mb-20">
        
        {/* Free Plan */}
        <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300 opacity-90 hover:opacity-100 relative">
          <div className="mb-4">
            <h3 className="font-bold text-gray-900 text-lg">Viajante Casual</h3>
            <p className="text-sm text-gray-500 mt-1">Para quem viaja ocasionalmente.</p>
          </div>
          <div className="mb-6">
            <span className="text-3xl font-bold text-gray-900">Grátis</span>
          </div>
          <Button variant="outline" className="w-full mb-6 font-medium text-gray-500 bg-gray-50 border-gray-200 cursor-default" disabled>
            Plano Atual
          </Button>
          <ul className="space-y-3 text-sm text-gray-600">
            <li className="flex gap-3">
              <Check className="w-5 h-5 text-brand-500 shrink-0" />
              <span>Até 2 viagens ativas</span>
            </li>
            <li className="flex gap-3">
              <Check className="w-5 h-5 text-brand-500 shrink-0" />
              <span>Roteiro dia a dia básico</span>
            </li>
            <li className="flex gap-3">
              <Check className="w-5 h-5 text-brand-500 shrink-0" />
              <span>Anexos limitados (5MB)</span>
            </li>
          </ul>
        </div>

        {/* Globetrotter Plan (Highlighted) */}
        <div className="bg-gradient-to-b from-brand-600 to-brand-700 rounded-2xl p-8 shadow-2xl ring-1 ring-white/20 relative transform md:scale-[1.03] z-10 text-white">
          {/* Badge */}
          <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-white text-brand-700 text-sm font-bold px-4 py-1 rounded-full shadow-lg ring-1 ring-brand-100 flex items-center gap-1.5 whitespace-nowrap">
             <Crown size={16} className="fill-brand-100" /> Mais Popular
          </div>

          <div className="mb-4">
            <h3 className="font-bold text-white text-xl">Globetrotter</h3>
            <p className="text-brand-100 text-sm mt-1">Ideal para quem viaja com frequência e quer controle total.</p>
          </div>
          
          <div className="mb-6">
            <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold text-white">R$ 19,90</span>
                <span className="text-brand-200 font-medium">/mês</span>
            </div>
            <p className="text-xs text-brand-200 font-medium mt-1 opacity-90">Menos que R$ 0,70 por dia</p>
          </div>
          
          <Button 
            className="w-full mt-6 mb-3 bg-white text-brand-700 hover:bg-gray-50 hover:shadow-xl hover:-translate-y-1 active:scale-95 transition-all duration-200 font-bold shadow-md border-none"
          >
            Assinar Agora
          </Button>

          <p className="text-[10px] text-brand-200 text-center mb-6 opacity-80 font-medium tracking-wide">
             Cartão de crédito • Cancele quando quiser
          </p>

          <div className="mt-4 space-y-4">
            <p className="text-xs font-bold text-brand-200 uppercase tracking-wider">Tudo do Casual, mais:</p>
            <ul className="space-y-3 text-sm text-white font-medium">
              <li className="flex gap-3 items-start">
                <Check className="w-5 h-5 text-brand-200 shrink-0" />
                <span>Viagens ilimitadas</span>
              </li>
              <li className="flex gap-3 items-start">
                <Check className="w-5 h-5 text-brand-200 shrink-0" />
                <span>Modo Offline completo</span>
              </li>
              <li className="flex gap-3 items-start">
                <Check className="w-5 h-5 text-brand-200 shrink-0" />
                <span>Exportação PDF do roteiro</span>
              </li>
              <li className="flex gap-3 items-start">
                <Check className="w-5 h-5 text-brand-200 shrink-0" />
                <span>Integração com Google Maps</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Family Plan */}
        <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300 opacity-90 hover:opacity-100 relative">
          <div className="mb-4">
            <h3 className="font-bold text-gray-900 text-lg">Família & Amigos</h3>
            <p className="text-sm text-gray-500 mt-1">Planejamento colaborativo.</p>
          </div>
          <div className="mb-6 flex items-baseline gap-1">
            <span className="text-3xl font-bold text-gray-900">R$ 34,90</span>
            <span className="text-gray-500 font-medium">/mês</span>
          </div>
          <Button variant="outline" className="w-full mb-6 font-medium border-gray-300 text-gray-700 hover:border-gray-400 hover:bg-gray-50">
            Escolher Família
          </Button>
          
          <div className="space-y-4">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Tudo do Globetrotter, mais:</p>
            <ul className="space-y-3 text-sm text-gray-600">
              <li className="flex gap-3">
                <Users className="w-5 h-5 text-blue-500 shrink-0" />
                <span>Até 5 colaboradores</span>
              </li>
              <li className="flex gap-3">
                <Zap className="w-5 h-5 text-yellow-500 shrink-0" />
                <span>Edição em tempo real</span>
              </li>
              <li className="flex gap-3">
                <Check className="w-5 h-5 text-brand-500 shrink-0" />
                <span>Chat e comentários</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="max-w-2xl mx-auto px-4">
        <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">Perguntas Frequentes</h2>
        <div className="space-y-4">
          {faqs.map((faq, idx) => (
            <div 
              key={idx} 
              className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => toggleFaq(idx)}
            >
              <button className="w-full flex justify-between items-center p-5 text-left focus:outline-none">
                <span className="font-medium text-gray-800">{faq.q}</span>
                {openFaq === idx ? (
                  <ChevronUp className="text-gray-400" size={20} />
                ) : (
                  <ChevronDown className="text-gray-400" size={20} />
                )}
              </button>
              <div 
                className={`overflow-hidden transition-all duration-300 ease-in-out ${
                  openFaq === idx ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'
                }`}
              >
                <p className="px-5 pb-5 text-sm text-gray-600 leading-relaxed">
                  {faq.a}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};