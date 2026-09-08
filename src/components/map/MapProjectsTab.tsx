import React, { useState } from 'react';
import { GoogleProjectsMap } from './GoogleProjectsMap';
import {
  Globe,
  MapPin,
  Plus,
  Compass,
  Sparkles,
  Building2,
  Users,
  DollarSign,
  TrendingUp,
  X,
  Plane,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { WORLD_COUNTRIES } from '../../data/worldMapData';
import { BRAZIL_STATES } from '../../data/brazilMapData';
import { formatCurrency } from '../../utils/formatters';

interface MapProjectsTabProps {
  onNavigateToClients?: () => void;
}

export const MapProjectsTab: React.FC<MapProjectsTabProps> = ({ onNavigateToClients }) => {
  const { clients, freelanceProjects, addClient } = useFinance();

  const [activeMapView, setActiveMapView] = useState<'world' | 'brazil'>('world');
  const [isAddClientModalOpen, setIsAddClientModalOpen] = useState(false);
  const [selectedCountryCode, setSelectedCountryCode] = useState('PT');
  const [selectedStateCode, setSelectedStateCode] = useState('SP');

  // Form states for new client modal
  const [clientName, setClientName] = useState('');
  const [clientCompany, setClientCompany] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientCountry, setClientCountry] = useState('PT');
  const [clientState, setClientState] = useState('');
  const [clientCity, setClientCity] = useState('');
  const [clientService, setClientService] = useState('Consultoria Remota & Design de Interiores');
  const [clientCurrency, setClientCurrency] = useState<'BRL' | 'USD' | 'EUR' | 'GBP' | 'AED'>('EUR');
  const [clientNotes, setClientNotes] = useState('');

  // Handle open modal from map
  const handleOpenAddForCountry = (countryCode: string) => {
    const cData = WORLD_COUNTRIES.find((c) => c.code === countryCode);
    setClientCountry(countryCode);
    setClientState(cData?.capital || '');
    setClientCurrency((cData?.currency as any) || 'USD');
    setClientPhone(cData?.dialCode ? `${cData.dialCode} ` : '');
    setIsAddClientModalOpen(true);
  };

  const handleOpenAddForState = (uf: string) => {
    const sData = BRAZIL_STATES.find((s) => s.uf === uf);
    setClientCountry('BR');
    setClientState(uf);
    setClientCity(sData?.capital || '');
    setClientCurrency('BRL');
    setClientPhone('+55 ');
    setIsAddClientModalOpen(true);
  };

  const handleSaveClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim() || !clientCity.trim()) return;

    const countryObj = WORLD_COUNTRIES.find((c) => c.code === clientCountry);

    addClient({
      name: clientName.trim(),
      company: clientCompany.trim(),
      email: clientEmail.trim(),
      phone: clientPhone.trim(),
      country: clientCountry,
      countryName: countryObj?.name || 'Internacional',
      countryFlag: countryObj?.flag || '🌍',
      currency: clientCurrency,
      state: clientCountry === 'BR' ? clientState : clientState || clientCity,
      city: clientCity.trim(),
      serviceType: clientService.trim() || 'Consultoria de Arquitetura & Interiores',
      notes: clientNotes.trim(),
      status: 'active',
    });

    // Reset form
    setClientName('');
    setClientCompany('');
    setClientEmail('');
    setClientPhone('');
    setClientCity('');
    setClientNotes('');
    setIsAddClientModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Map Switcher Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-[#1a1614] rounded-2xl border border-[#3d342f] shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[#c58a4b]/20 border border-[#c58a4b]/30 text-[#e0a96d]">
            <Compass className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#fcf8f5] font-serif tracking-tight">
              Alcance Geográfico • Projetos & Clientes
            </h1>
            <p className="text-xs text-[#a89c93] mt-0.5">
              Acompanhe a expansão da marca Laíne Paula Arquitetura no Brasil e no exterior.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Map View Mode Tabs */}
          <div className="flex items-center bg-[#12100e] p-1 rounded-xl border border-[#3d342f]">
            <button
              onClick={() => setActiveMapView('world')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeMapView === 'world'
                  ? 'bg-[#c58a4b] text-[#12100e] shadow-md'
                  : 'text-[#a89c93] hover:text-[#fcf8f5]'
              }`}
            >
              <Globe className="w-4 h-4" />
              <span>Mapa Mundi (Exterior)</span>
            </button>
            <button
              onClick={() => setActiveMapView('brazil')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeMapView === 'brazil'
                  ? 'bg-[#c58a4b] text-[#12100e] shadow-md'
                  : 'text-[#a89c93] hover:text-[#fcf8f5]'
              }`}
            >
              <MapPin className="w-4 h-4" />
              <span>Mapa do Brasil (UFs)</span>
            </button>
          </div>

          {/* Add Client Button */}
          <button
            onClick={() => {
              if (activeMapView === 'world') {
                handleOpenAddForCountry('US');
              } else {
                handleOpenAddForState('SP');
              }
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-[#fcf8f5] text-xs font-semibold transition-colors shadow-lg cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Novo Cliente</span>
          </button>
        </div>
      </div>

      {/* Render Active Map View */}
      <div className="h-[600px] p-2 sm:p-4 bg-[#1a1614] rounded-2xl border border-[#3d342f] shadow-xl">
        <GoogleProjectsMap 
          activeView={activeMapView} 
          onAddClientForLocation={(code, isBrazil) => {
            if (isBrazil) handleOpenAddForState(code);
            else handleOpenAddForCountry(code);
          }} 
        />
      </div>

      {/* Add Client Modal */}
      {isAddClientModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-[#1a1614] border border-[#3d342f] rounded-2xl shadow-2xl p-6 relative overflow-hidden">
            <div className="flex items-center justify-between pb-4 border-b border-[#3d342f]">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-[#c58a4b]/20 text-[#e0a96d]">
                  <Users className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-bold text-base text-[#fcf8f5] font-serif">
                    Novo Cliente & Contrato
                  </h3>
                  <p className="text-xs text-[#a89c93]">
                    Cadastrar cliente nacional ou internacional no mapa
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAddClientModalOpen(false)}
                className="p-2 rounded-xl text-[#a89c93] hover:text-[#fcf8f5] hover:bg-[#26211d] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveClient} className="mt-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-[#a89c93] mb-1 font-medium">
                    Nome do Cliente / Casal *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: John Smith / Villa Heritage"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    className="w-full bg-[#12100e] border border-[#3d342f] rounded-xl px-3.5 py-2.5 text-xs text-[#fcf8f5] outline-none focus:border-[#c58a4b]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#a89c93] mb-1 font-medium">
                    Empresa / Residência
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Brickell Residences LLC"
                    value={clientCompany}
                    onChange={(e) => setClientCompany(e.target.value)}
                    className="w-full bg-[#12100e] border border-[#3d342f] rounded-xl px-3.5 py-2.5 text-xs text-[#fcf8f5] outline-none focus:border-[#c58a4b]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-[#a89c93] mb-1 font-medium">
                    País de Atuação *
                  </label>
                  <select
                    value={clientCountry}
                    onChange={(e) => {
                      const newCountry = e.target.value;
                      setClientCountry(newCountry);
                      const cObj = WORLD_COUNTRIES.find((c) => c.code === newCountry);
                      if (cObj) {
                        setClientCurrency((cObj.currency as any) || 'USD');
                        if (cObj.dialCode) setClientPhone(`${cObj.dialCode} `);
                      }
                    }}
                    className="w-full bg-[#12100e] border border-[#3d342f] rounded-xl px-3 py-2.5 text-xs text-[#fcf8f5] outline-none focus:border-[#c58a4b]"
                  >
                    {WORLD_COUNTRIES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.flag} {c.name} ({c.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-[#a89c93] mb-1 font-medium">
                    {clientCountry === 'BR' ? 'Estado (UF) *' : 'Região / Estado'}
                  </label>
                  {clientCountry === 'BR' ? (
                    <select
                      value={clientState}
                      onChange={(e) => setClientState(e.target.value)}
                      className="w-full bg-[#12100e] border border-[#3d342f] rounded-xl px-3 py-2.5 text-xs text-[#fcf8f5] outline-none focus:border-[#c58a4b]"
                    >
                      {BRAZIL_STATES.map((s) => (
                        <option key={s.uf} value={s.uf}>
                          {s.name} ({s.uf})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      placeholder="Ex: Flórida, Lisboa, Lombardia"
                      value={clientState}
                      onChange={(e) => setClientState(e.target.value)}
                      className="w-full bg-[#12100e] border border-[#3d342f] rounded-xl px-3.5 py-2.5 text-xs text-[#fcf8f5] outline-none focus:border-[#c58a4b]"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-xs text-[#a89c93] mb-1 font-medium">
                    Cidade / Região *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Miami, Lisboa, Milão"
                    value={clientCity}
                    onChange={(e) => setClientCity(e.target.value)}
                    className="w-full bg-[#12100e] border border-[#3d342f] rounded-xl px-3.5 py-2.5 text-xs text-[#fcf8f5] outline-none focus:border-[#c58a4b]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-[#a89c93] mb-1 font-medium">
                    Telefone / WhatsApp com DDI
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: +1 (305) 555-0199"
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    className="w-full bg-[#12100e] border border-[#3d342f] rounded-xl px-3.5 py-2.5 text-xs text-[#fcf8f5] outline-none focus:border-[#c58a4b]"
                  />
                </div>

                <div>
                  <label className="block text-xs text-[#a89c93] mb-1 font-medium">
                    Moeda do Contrato
                  </label>
                  <select
                    value={clientCurrency}
                    onChange={(e) => setClientCurrency(e.target.value as any)}
                    className="w-full bg-[#12100e] border border-[#3d342f] rounded-xl px-3 py-2.5 text-xs text-[#fcf8f5] outline-none focus:border-[#c58a4b]"
                  >
                    <option value="BRL">BRL - Real Brasileiro (R$)</option>
                    <option value="USD">USD - Dólar Americano ($)</option>
                    <option value="EUR">EUR - Euro (€)</option>
                    <option value="GBP">GBP - Libra Esterlina (£)</option>
                    <option value="AED">AED - Dirham Emirados (AED)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs text-[#a89c93] mb-1 font-medium">
                  Tipo de Serviço / Escopo
                </label>
                <input
                  type="text"
                  placeholder="Ex: Consultoria Remota de Interiores & Renders 3D"
                  value={clientService}
                  onChange={(e) => setClientService(e.target.value)}
                  className="w-full bg-[#12100e] border border-[#3d342f] rounded-xl px-3.5 py-2.5 text-xs text-[#fcf8f5] outline-none focus:border-[#c58a4b]"
                />
              </div>

              <div>
                <label className="block text-xs text-[#a89c93] mb-1 font-medium">
                  Observações / Detalhes de Fuso & Reuniões
                </label>
                <textarea
                  rows={2}
                  placeholder="Ex: Alinhamento semanal via Zoom às 14h BRT (18h local)."
                  value={clientNotes}
                  onChange={(e) => setClientNotes(e.target.value)}
                  className="w-full bg-[#12100e] border border-[#3d342f] rounded-xl px-3.5 py-2 text-xs text-[#fcf8f5] outline-none focus:border-[#c58a4b] resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#3d342f]">
                <button
                  type="button"
                  onClick={() => setIsAddClientModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[#a89c93] hover:text-[#fcf8f5] hover:bg-[#26211d] transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#c58a4b] hover:bg-[#b57a3b] text-[#12100e] text-xs font-bold transition-colors shadow-lg"
                >
                  Salvar Cliente no Mapa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
