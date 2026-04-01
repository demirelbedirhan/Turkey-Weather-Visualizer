import React, { useEffect, useState, useRef } from "react";
import { cn } from "@/src/lib/utils";
import { 
  Cloud, Sun, Download, Map as MapIcon, Info, ExternalLink
} from "lucide-react";
import { toJpeg, toSvg } from "html-to-image";
import { MapContainer, TileLayer, GeoJSON } from "react-leaflet";
import * as topojson from "topojson-client";
import L from "leaflet";
import { PROVINCES_DATA } from "./data/provinces";

interface WeatherData {
  cityId: string;
  cityName: string;
  warningLevel: "green" | "yellow" | "orange" | "red";
  warningIcon?: string;
  url?: string;
}

export default function App() {
  const [weather, setWeather] = useState<Record<string, WeatherData>>({});
  const [geoData, setGeoData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [customData, setCustomData] = useState("");
  const [showExportMenu, setShowExportMenu] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const processWarningsData = (warningsData: any) => {
    const newWeather: Record<string, WeatherData> = {};

    // Initialize with default green and url
    PROVINCES_DATA.forEach(p => {
      newWeather[p.id] = {
        cityId: p.id,
        cityName: p.name,
        warningLevel: "green",
        url: p.url
      };
    });

    // Map warnings data (MeteoUyari format)
    if (Array.isArray(warningsData)) {
      warningsData.forEach((alert: any) => {
        ['yellow', 'orange', 'red'].forEach((level) => {
          if (alert.towns && alert.towns[level]) {
            alert.towns[level].forEach((townCode: number) => {
              const plaka = townCode.toString().substring(1, 3);
              if (newWeather[plaka]) {
                const currentLevel = newWeather[plaka].warningLevel;
                // Override rule: red > orange > yellow
                const shouldOverride = 
                  level === 'red' || 
                  (level === 'orange' && currentLevel !== 'red') || 
                  (level === 'yellow' && currentLevel === 'green');

                if (shouldOverride) {
                  newWeather[plaka].warningLevel = level as any;
                  
                  if (alert.weather && alert.weather[level] && alert.weather[level].length > 0) {
                    // Take the first warning type as the primary icon
                    newWeather[plaka].warningIcon = alert.weather[level][0];
                  }
                }
              }
            });
          }
        });
      });
    }

    setWeather(newWeather);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [warningsRes, topoRes] = await Promise.all([
          fetch("/api/weather/warnings"),
          fetch("https://code.highcharts.com/mapdata/countries/tr/tr-all.topo.json")
        ]);

        const warningsData = await warningsRes.json();
        const topoData = await topoRes.json();

        const geoJsonData = topojson.feature(topoData, topoData.objects.default);
        setGeoData(geoJsonData);

        processWarningsData(warningsData);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleUpdateCustomData = () => {
    try {
      const parsed = JSON.parse(customData);
      processWarningsData(parsed);
    } catch (e) {
      alert("Geçersiz JSON verisi. Lütfen geçerli bir MGM verisi girin.");
    }
  };

  const handleSampleReference = () => {
    const sampleData = [];
    const levels = ['yellow', 'orange', 'red'];
    const weatherTypes = ['thunderstorm', 'snow', 'rain', 'wind', 'fog', 'temperature'];
    
    for (let i = 0; i < 5; i++) {
      const level = levels[Math.floor(Math.random() * levels.length)];
      const wType = weatherTypes[Math.floor(Math.random() * weatherTypes.length)];
      
      const towns: any = {};
      towns[level] = [];
      
      const numProvinces = Math.floor(Math.random() * 5) + 3;
      for (let j = 0; j < numProvinces; j++) {
        const randomProvince = PROVINCES_DATA[Math.floor(Math.random() * PROVINCES_DATA.length)];
        towns[level].push(parseInt(`1${randomProvince.id}00`));
      }
      
      const weatherObj: any = {};
      weatherObj[level] = [wType];
      
      sampleData.push({
        towns,
        weather: weatherObj
      });
    }
    
    setCustomData(JSON.stringify(sampleData, null, 2));
    processWarningsData(sampleData);
  };

  const exportJpeg = async () => {
    if (containerRef.current === null) return;
    try {
      const dataUrl = await toJpeg(containerRef.current, { 
        quality: 0.95,
        backgroundColor: '#ffffff',
        width: 1620,
        height: 1080,
        pixelRatio: 1
      });
      const link = document.createElement("a");
      link.download = "turkey-weather-map.jpg";
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Export failed", err);
    }
  };

  const exportSvg = async () => {
    if (containerRef.current === null) return;
    try {
      const dataUrl = await toSvg(containerRef.current, { 
        backgroundColor: '#ffffff',
        width: 1620,
        height: 1080,
      });
      const link = document.createElement("a");
      link.download = "turkey-weather-map.svg";
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Export failed", err);
    }
  };

  const getWarningColor = (level: string) => {
    switch (level) {
      case 'red': return '#dd2c0a';
      case 'orange': return '#f6a403';
      case 'yellow': return '#ffd600';
      default: return '#e8e9eb';
    }
  };

  const getStyle = (feature: any) => {
    const hcKey = feature.properties['hc-key'];
    const province = PROVINCES_DATA.find(p => p.hcKey === hcKey);
    
    if (province && weather[province.id]) {
      const color = getWarningColor(weather[province.id].warningLevel);
      return {
        fillColor: color,
        weight: 1,
        opacity: 1,
        color: 'white',
        fillOpacity: 1,
        className: 'cursor-pointer transition-opacity hover:fill-opacity-80'
      };
    }
    
    return {
      fillColor: '#e2e8f0',
      weight: 1,
      opacity: 1,
      color: 'white',
      fillOpacity: 1
    };
  };

  const onEachFeature = (feature: any, layer: L.Layer) => {
    const hcKey = feature.properties['hc-key'];
    const province = PROVINCES_DATA.find(p => p.hcKey === hcKey);
    
    if (province && province.url) {
      layer.on({
        click: () => {
          window.open(province.url, '_blank');
        },
        mouseover: (e) => {
          const target = e.target as L.Path;
          target.setStyle({
            fillOpacity: 0.9,
            weight: 2
          });
        },
        mouseout: (e) => {
          const target = e.target as L.Path;
          target.setStyle({
            fillOpacity: 1,
            weight: 1
          });
        }
      });
    }
  };

  if (loading || !geoData) return (
    <div className="min-h-screen bg-[#fcfdff] flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#fcfdff] p-4 flex flex-col items-center overflow-x-auto relative">
      {/* Top Left Controls */}
      <div className="fixed top-4 left-4 z-50 flex flex-col gap-2 bg-white/90 backdrop-blur-sm p-4 rounded-lg shadow-lg w-80 border border-slate-200">
        <h3 className="text-sm font-bold text-slate-700">MGM Verisi (JSON)</h3>
        <textarea 
          className="w-full h-32 p-2 text-xs border border-slate-300 rounded resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
          placeholder="MGM JSON verisini buraya yapıştırın..."
          value={customData}
          onChange={(e) => setCustomData(e.target.value)}
        />
        <div className="flex gap-2">
          <button 
            onClick={handleUpdateCustomData}
            className="flex-1 bg-blue-600 text-white px-3 py-2 rounded text-sm font-bold hover:bg-blue-700 transition-colors"
          >
            Güncelle
          </button>
          <button 
            onClick={handleSampleReference}
            className="flex-1 bg-amber-500 text-white px-3 py-2 rounded text-sm font-bold hover:bg-amber-600 transition-colors"
          >
            Örnek Referans
          </button>
        </div>
      </div>

      {/* Top Right Controls */}
      <div className="fixed top-4 right-4 z-50 relative">
        <button 
          onClick={() => setShowExportMenu(!showExportMenu)}
          className="flex items-center gap-2 bg-slate-800 text-white px-6 py-3 rounded-full font-bold uppercase text-sm hover:bg-slate-700 transition-all shadow-lg"
        >
          <Download className="w-5 h-5" />
          Görsel Dışarı Aktar
        </button>
        {showExportMenu && (
          <div className="absolute top-full right-0 mt-2 bg-white rounded-lg shadow-xl border border-slate-200 overflow-hidden flex flex-col w-full">
            <button 
              onClick={() => { exportJpeg(); setShowExportMenu(false); }}
              className="px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-100 text-left"
            >
              JPEG İndir
            </button>
            <button 
              onClick={() => { exportSvg(); setShowExportMenu(false); }}
              className="px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-100 text-left border-t border-slate-100"
            >
              SVG İndir
            </button>
          </div>
        )}
      </div>

      <div 
        ref={containerRef}
        className="relative flex-shrink-0 mt-8"
        style={{ width: '1620px', height: '1080px', fontFamily: "'Roboto', sans-serif", backgroundColor: '#fdfeff' }}
      >
        {/* Map Section */}
        <div className="w-full h-full relative z-0" style={{ backgroundColor: '#fdfeff' }}>
          <MapContainer 
            center={[39.0, 35.0]} 
            zoom={6.5} 
            zoomSnap={0.1}
            scrollWheelZoom={false}
            dragging={false}
            doubleClickZoom={false}
            touchZoom={false}
            keyboard={false}
            className="w-full h-full"
            zoomControl={false}
          >
            <GeoJSON 
              data={geoData} 
              style={getStyle}
              onEachFeature={onEachFeature}
            />
          </MapContainer>
        </div>
      </div>
    </div>
  );
}

