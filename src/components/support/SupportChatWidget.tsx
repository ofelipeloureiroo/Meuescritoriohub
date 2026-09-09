import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Headset, CheckCircle2, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface Message {
  id: string;
  sender: 'user' | 'support';
  text: string;
  time: string;
}

export const SupportChatWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const { user, profile } = useAuth();
  const userName = profile?.name || user?.displayName || 'Usuário';

  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      sender: 'support',
      text: `Olá, ${userName}! Seja bem-vindo(a) ao Suporte do Escritório Online. Como podemos te ajudar hoje?`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [isOpen, messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    const userText = inputMessage.trim();
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const newMsg: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: userText,
      time: timeStr,
    };

    setMessages((prev) => [...prev, newMsg]);
    setInputMessage('');

    // Simulate automated support response
    setTimeout(() => {
      let replyText = 'Recebemos sua mensagem! Nossa equipe de suporte técnico e atendimento responderá em breve por aqui e também no seu e-mail cadastrado.';
      const lower = userText.toLowerCase();

      if (lower.includes('olá') || lower.includes('oi') || lower.includes('bom dia') || lower.includes('boa tarde')) {
        replyText = `Olá, ${userName}! Em que posso auxiliar na sua gestão hoje?`;
      } else if (lower.includes('financeiro') || lower.includes('pagamento') || lower.includes('cobrança') || lower.includes('assinatura')) {
        replyText = 'Para questões financeiras ou de assinatura, você pode acessar a aba de Configurações ou Planos. Se precisar de ajuste em faturas, nossa equipe financeira foi notificada.';
      } else if (lower.includes('lead') || lower.includes('pipeline') || lower.includes('comercial')) {
        replyText = 'No módulo Comercial & Leads, você pode cadastrar novos leads, configurar etapas do pipeline e filtrar por pontuação de score. Precisa de ajuda com alguma automação específica?';
      }

      const supportReply: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'support',
        text: replyText,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, supportReply]);
    }, 1000);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Floating Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2.5 px-5 py-3.5 bg-[var(--theme-primary)] hover:opacity-95 text-[#14110f] font-bold text-xs rounded-full shadow-2xl transition-all cursor-pointer group hover:scale-105"
        >
          <div className="relative">
            <Headset className="w-5 h-5" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-[#14110f] animate-pulse" />
          </div>
          <span className="tracking-wide">Suporte Online</span>
        </button>
      )}

      {/* Chat Window Modal */}
      {isOpen && (
        <div className="w-[360px] sm:w-[400px] h-[520px] bg-[#1c1815] border border-[#3d342f] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          {/* Header */}
          <div className="bg-[#14110f] px-5 py-4 border-b border-[#3d342f] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[var(--theme-primary)]/10 border border-[var(--theme-primary)]/30 flex items-center justify-center text-[var(--theme-primary)]">
                <Headset className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-serif font-bold text-[#fcf8f5] text-sm tracking-wide">Suporte Dedicado</h3>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] text-[#a89c93] font-medium">Equipe online • Resposta rápida</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-[#a89c93] hover:text-[#fcf8f5] p-1.5 rounded-lg hover:bg-[#28221e] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages Body */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-[#181412]">
            <div className="text-center my-2">
              <span className="text-[10px] text-[#a89c93] bg-[#221c19] px-3 py-1 rounded-full border border-[#302722]">
                Início da conversa com o suporte
              </span>
            </div>

            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
              >
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                    msg.sender === 'user'
                      ? 'bg-[var(--theme-primary)] text-[#14110f] font-bold text-xs'
                      : 'bg-[#2a2320] text-[var(--theme-primary)] border border-[#3d342f]'
                  }`}
                >
                  {msg.sender === 'user' ? <User className="w-3.5 h-3.5" /> : <Headset className="w-3.5 h-3.5" />}
                </div>

                <div
                  className={`max-w-[78%] px-4 py-3 rounded-2xl text-xs space-y-1 shadow-sm ${
                    msg.sender === 'user'
                      ? 'bg-[var(--theme-primary)] text-[#14110f] font-medium rounded-tr-xs'
                      : 'bg-[#221c19] text-[#fcf8f5] border border-[#302722] rounded-tl-xs'
                  }`}
                >
                  <p className="leading-relaxed">{msg.text}</p>
                  <div
                    className={`text-[9px] text-right flex items-center justify-end gap-1 ${
                      msg.sender === 'user' ? 'text-[#14110f]/70' : 'text-[#a89c93]'
                    }`}
                  >
                    <span>{msg.time}</span>
                    {msg.sender === 'user' && <CheckCircle2 className="w-3 h-3" />}
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Footer */}
          <form onSubmit={handleSendMessage} className="p-3 bg-[#14110f] border-t border-[#3d342f] flex items-center gap-2">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Digite sua dúvida ou mensagem..."
              className="flex-1 px-4 py-2.5 rounded-xl bg-[#1c1815] border border-[#3d342f] text-[#fcf8f5] text-xs focus:outline-none focus:border-[var(--theme-primary)] placeholder:text-[#8a7e76]"
            />
            <button
              type="submit"
              disabled={!inputMessage.trim()}
              className="p-2.5 bg-[var(--theme-primary)] hover:opacity-90 disabled:opacity-40 text-[#14110f] rounded-xl transition-all cursor-pointer flex items-center justify-center shadow-md"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
