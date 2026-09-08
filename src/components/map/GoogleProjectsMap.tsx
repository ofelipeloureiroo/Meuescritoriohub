import React, { useMemo, useState } from 'react';
import { APIProvider, Map, Marker, InfoWindow } from '@vis.gl/react-google-maps';
import { useFinance } from '../../context/FinanceContext';
import { formatCurrency } from '../../utils/formatters';
import { Users, Building2, MapPin, Plus } from 'lucide-react';
import { WORLD_COUNTRIES } from '../../data/worldMapData';
import { BRAZIL_STATES } from '../../data/brazilMapData';

interface GoogleProjectsMapProps {
  onAddClientForLocation?: (code: string, isBrazil: boolean) => void;
  activeView: 'world' | 'brazil';
}

const COUNTRY_COORDINATES: Record<string, { lat: number; lng: number }> = {
  'BR': { lat: -14.235, lng: -51.925 },
  'US': { lat: 37.090, lng: -95.712 },
  'PT': { lat: 39.399, lng: -8.224 },
  'IT': { lat: 41.871, lng: 12.567 },
  'ES': { lat: 40.463, lng: -3.749 },
  'FR': { lat: 46.227, lng: 2.213 },
  'GB': { lat: 55.378, lng: -3.435 },
  'AE': { lat: 23.424, lng: 53.847 },
  'AU': { lat: -25.274, lng: 133.775 },
  'CA': { lat: 56.130, lng: -106.346 },
  'MX': { lat: 23.634, lng: -102.552 },
  'AR': { lat: -38.416, lng: -63.616 },
  'CL': { lat: -35.675, lng: -71.542 },
  'UY': { lat: -32.522, lng: -55.765 },
  'CO': { lat: 4.570, lng: -74.297 },
  'DE': { lat: 51.165, lng: 10.451 },
  'NL': { lat: 52.132, lng: 5.291 },
  'CH': { lat: 46.818, lng: 8.227 },
  'IE': { lat: 53.142, lng: -7.692 },
  'JP': { lat: 36.204, lng: 138.252 },
  'CN': { lat: 35.861, lng: 104.195 },
  'NZ': { lat: -40.900, lng: 174.885 },
  'ZA': { lat: -30.559, lng: 22.937 },
  'AO': { lat: -11.202, lng: 17.873 },
  'MZ': { lat: -18.665, lng: 35.529 },
  'SA': { lat: 23.885, lng: 45.079 },
  'QA': { lat: 25.354, lng: 51.183 },
};

const BRAZIL_STATE_COORDINATES: Record<string, { lat: number; lng: number }> = {
  'AC': { lat: -9.02, lng: -70.81 },
  'AL': { lat: -9.57, lng: -36.78 },
  'AP': { lat: 0.90, lng: -52.00 },
  'AM': { lat: -3.41, lng: -65.85 },
  'BA': { lat: -12.57, lng: -41.70 },
  'CE': { lat: -5.49, lng: -39.32 },
  'DF': { lat: -15.79, lng: -47.88 },
  'ES': { lat: -19.18, lng: -40.30 },
  'GO': { lat: -15.82, lng: -49.83 },
  'MA': { lat: -4.96, lng: -45.27 },
  'MT': { lat: -12.68, lng: -56.92 },
  'MS': { lat: -20.77, lng: -54.78 },
  'MG': { lat: -18.51, lng: -44.55 },
  'PA': { lat: -1.99, lng: -54.93 },
  'PB': { lat: -7.23, lng: -36.72 },
  'PR': { lat: -25.25, lng: -52.02 },
  'PE': { lat: -8.81, lng: -36.95 },
  'PI': { lat: -7.11, lng: -41.82 },
  'RJ': { lat: -22.90, lng: -43.20 },
  'RN': { lat: -5.79, lng: -36.56 },
  'RS': { lat: -30.03, lng: -51.21 },
  'RO': { lat: -11.50, lng: -63.58 },
  'RR': { lat: -2.73, lng: -62.07 },
  'SC': { lat: -27.24, lng: -50.21 },
  'SP': { lat: -23.55, lng: -46.63 },
  'SE': { lat: -10.57, lng: -37.38 },
  'TO': { lat: -10.17, lng: -48.29 },
};

export const GoogleProjectsMap: React.FC<GoogleProjectsMapProps> = ({ activeView, onAddClientForLocation }) => {
  const { clients, architectureProjects } = useFinance();
  const [selectedMarker, setSelectedMarker] = useState<string | null>(null);

  // Default center based on view
  const defaultCenter = activeView === 'brazil' 
    ? { lat: -14.235, lng: -51.925 } // Center of Brazil
    : { lat: 20, lng: 0 }; // World center

  const defaultZoom = activeView === 'brazil' ? 4 : 2;

  const markersData = useMemo(() => {
    if (activeView === 'world') {
      const countryData: Record<string, { code: string; name: string; clients: number; revenue: number; lat: number; lng: number }> = {};
      
      const processItem = (countryCode: string | undefined, stateCode: string | undefined, value: number) => {
        let code = countryCode || 'BR';
        if (!countryCode && stateCode && BRAZIL_STATE_COORDINATES[stateCode.toUpperCase()]) {
          code = 'BR';
        }

        if (!countryData[code]) {
          const coords = COUNTRY_COORDINATES[code] || { lat: 0, lng: 0 };
          const countryInfo = WORLD_COUNTRIES.find(wc => wc.code === code);
          countryData[code] = {
            code,
            name: countryInfo?.name || code,
            clients: 0,
            revenue: 0,
            lat: coords.lat,
            lng: coords.lng,
          };
        }
        countryData[code].clients += 1;
        countryData[code].revenue += value;
      };

      clients.forEach(c => processItem(c.country, c.state, c.totalBilled || 0));
      architectureProjects.forEach(p => processItem(p.country, p.state, p.honorarios || 0));

      return Object.values(countryData).filter(d => d.lat !== 0 && d.lng !== 0);
    } else {
      // Brazil states
      const stateData: Record<string, { code: string; name: string; clients: number; revenue: number; lat: number; lng: number }> = {};
      
      const processStateItem = (countryCode: string | undefined, stateName: string | undefined, value: number) => {
        const code = countryCode || 'BR';
        if (code === 'BR' && stateName) {
          const rawState = stateName.trim().toUpperCase();
          const matchedState = BRAZIL_STATES.find(s => s.uf === rawState || s.name.toUpperCase() === rawState);
          const uf = matchedState ? matchedState.uf : rawState;
          
          if (!stateData[uf]) {
            const coords = BRAZIL_STATE_COORDINATES[uf];
            if (coords) {
              const stateInfo = BRAZIL_STATES.find(s => s.uf === uf);
              stateData[uf] = {
                code: uf,
                name: stateInfo?.name || uf,
                clients: 0,
                revenue: 0,
                lat: coords.lat,
                lng: coords.lng,
              };
            }
          }
          if (stateData[uf]) {
            stateData[uf].clients += 1;
            stateData[uf].revenue += value;
          }
        }
      };

      clients.forEach(c => processStateItem(c.country, c.state, c.totalBilled || 0));
      architectureProjects.forEach(p => processStateItem(p.country, p.state, p.honorarios || 0));

      return Object.values(stateData);
    }
  }, [clients, architectureProjects, activeView]);

  // Using an empty string for API key means it will render in Development Mode (which is fine for preview)
  const mapOptions = {
    disableDefaultUI: false,
    gestureHandling: 'greedy'
  };

  return (
    <div className="w-full h-full min-h-[400px] rounded-2xl overflow-hidden shadow-xl border border-[#3d342f] relative">
      <APIProvider apiKey="">
        <Map
          defaultCenter={defaultCenter}
          defaultZoom={defaultZoom}
          disableDefaultUI={mapOptions.disableDefaultUI}
          gestureHandling={mapOptions.gestureHandling as any}
          className="w-full h-full"
        >
          {markersData.map((marker) => (
            <Marker
              key={marker.code}
              position={{ lat: marker.lat, lng: marker.lng }}
              onClick={() => setSelectedMarker(marker.code)}
            >
              {selectedMarker === marker.code && (
                <InfoWindow
                  position={{ lat: marker.lat, lng: marker.lng }}
                  onCloseClick={() => setSelectedMarker(null)}
                >
                  <div className="p-1 min-w-[200px] text-[#12100e]">
                    <h3 className="font-bold text-base mb-2 pb-2 border-b border-gray-200">
                      {marker.name}
                    </h3>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1 text-gray-600"><Users className="w-3.5 h-3.5"/> Clientes</span>
                        <span className="font-bold">{marker.clients}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1 text-gray-600"><Building2 className="w-3.5 h-3.5"/> Faturamento</span>
                        <span className="font-bold text-emerald-600">{formatCurrency(marker.revenue)}</span>
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        if (onAddClientForLocation) {
                          onAddClientForLocation(marker.code, activeView === 'brazil');
                        }
                      }}
                      className="w-full mt-4 flex items-center justify-center gap-1 py-2 bg-[#c58a4b] text-white rounded-lg text-xs font-bold hover:bg-[#b57a3b] transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" /> Adicionar Cliente
                    </button>
                  </div>
                </InfoWindow>
              )}
            </Marker>
          ))}
        </Map>
      </APIProvider>

      {/* Overlay to inform about development mode if needed, though Maps does this natively */}
      <div className="absolute bottom-4 left-4 right-4 md:right-auto md:w-auto p-3 bg-[#12100e]/80 backdrop-blur-sm border border-[#3d342f] rounded-xl text-xs text-[#a89c93]">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-[#c58a4b]" />
          <span>
            {activeView === 'world' 
              ? 'Mapa Mundi (Google Maps) - Visão Global de Clientes' 
              : 'Mapa do Brasil (Google Maps) - Visão Nacional'}
          </span>
        </div>
      </div>
    </div>
  );
};
