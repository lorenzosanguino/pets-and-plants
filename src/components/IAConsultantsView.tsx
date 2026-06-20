import React, { useState, useRef, useEffect } from 'react';
import { GeminiAPIService } from '../services/geminiAPI';
import { ImageOptimizer } from '../utils/imageOptimizer';
import { safeUUID } from '../utils/uuid';
import { LocalDatabase } from '../database/db';
import { TTSButton } from '../utils/useTTS';
import type { ChatMensaje } from '../database/types';

interface ChatMessage {
  id: string;
  sender: 'user' | 'ia';
  text: string;
  timestamp: Date;
  imageUrl?: string;
  diagnosticoClinico?: {
    tratamiento: string;
    advertencia: string;
    esUrgente: boolean;
    abrirFicha?: { tipo: 'mascota' | 'planta' | 'exotico'; id: string } | null;
  };
}

interface IAConsultantsViewProps {
  forceConsultant?: 'veterinario' | 'agronomo' | 'exoticos';
  hideSelector?: boolean;
  onNavigateToAsset?: (tipo: 'mascota' | 'planta' | 'exotico', id: string) => void;
  onUpdate?: () => void;
}

export const IAConsultantsView: React.FC<IAConsultantsViewProps> = ({ 
  forceConsultant,
  hideSelector = false,
  onNavigateToAsset,
  onUpdate
}) => {
  const theme = localStorage.getItem('petplant_game_theme') || 'adventure';

  const [activeConsultant, setActiveConsultant] = useState<'veterinario' | 'agronomo' | 'exoticos'>(
    forceConsultant || 'veterinario'
  );
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  
  const [attachedImage, setAttachedImage] = useState<{ blob: Blob; dataUrl: string } | null>(null);
  const [selectedTemplateKey, setSelectedTemplateKey] = useState<'vet_garrapata' | 'vet_herida' | 'plant_marron' | 'plant_parasito' | undefined>(undefined);
  const [loadingIA, setLoadingIA] = useState(false);

  const [isDragging, setIsDragging] = useState(false);
  const dragCounter = useRef(0);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current++;
    if (dragCounter.current === 1) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setIsDragging(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current = 0;
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (file.type.startsWith('image/')) {
        try {
          const optimized = await ImageOptimizer.optimize(file);
          setAttachedImage(optimized);
          setSelectedTemplateKey(undefined);
        } catch (err) {
          console.error("Error al optimizar la imagen arrastrada:", err);
          alert("Error al optimizar la imagen arrastrada.");
        }
      } else {
        alert("Solo se admiten archivos de imagen para diagnóstico.");
      }
    }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Historial de chat dinámico cargado desde IndexedDB
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  // Auto-scroll al final del chat cuando cambian los mensajes o el estado de carga
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loadingIA]);

  useEffect(() => {
    const loadChat = async () => {
      try {
        const hist = await LocalDatabase.getChatHistorial(activeConsultant);
        if (hist && hist.mensajes && hist.mensajes.length > 0) {
          const mapped = hist.mensajes.map((m: ChatMensaje) => ({
            id: m.id,
            sender: (m.remitente === 'usuario' ? 'user' : 'ia') as 'user' | 'ia',
            text: m.texto,
            timestamp: new Date(m.fecha)
          }));
          setMessages(mapped);
        } else {
          let defaultText = '';
          if (activeConsultant === 'veterinario') {
            defaultText = 'Hola. Soy tu consultor de bienestar animal y prevención veterinaria. ¿En qué puedo asesorarte hoy con respecto al enriquecimiento del hogar o control clínico? Puedes adjuntar una foto de tu mascota o usar una plantilla rápida para analizar heridas o parásitos de forma preventiva.';
          } else if (activeConsultant === 'agronomo') {
            defaultText = 'Hola. Soy tu consultor agrónomo y paisajista. Estoy aquí para resolver dudas sobre microclimas domésticos, sustratos y requerimientos de cultivo. Puedes adjuntar una foto de tus plantas o usar una plantilla rápida para diagnosticar hojas marrones o plagas foliares.';
          } else {
            defaultText = 'Hola. Soy tu consultor especialista en animales exóticos. Puedo ayudarte con las condiciones ideales de temperatura y humedad para tu terrario, frecuencia de alimentación de reptiles y artrópodos, o control de mudas de piel. ¿Qué especie exótica tienes hoy?';
          }
          setMessages([{
            id: '1',
            sender: 'ia',
            text: defaultText,
            timestamp: new Date()
          }]);
        }
      } catch (err) {
        console.error("Error loading chat history:", err);
      }
    };
    loadChat();
  }, [activeConsultant]);

  const [freqBars, setFreqBars] = useState<number[]>([4, 6, 2, 8, 5, 7, 3, 6, 4, 8]);

  // Simular animación de ecualizador de Codec MGS
  useEffect(() => {
    if (theme !== 'adventure') return;
    const interval = setInterval(() => {
      setFreqBars(Array.from({ length: 12 }, () => Math.floor(Math.random() * 12) + 1));
    }, 150);
    return () => clearInterval(interval);
  }, [theme]);

  const activeHistory = messages;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const rec = new SpeechRecognition();
    rec.continuous = false;
    rec.lang = 'es-ES';
    rec.interimResults = false;

    rec.onstart = () => {
      setIsListening(true);
    };

    rec.onend = () => {
      setIsListening(false);
    };

    rec.onresult = (event: any) => {
      const transcript = event.results[0]?.[0]?.transcript;
      if (transcript) {
        setInputText((prev) => (prev ? prev + ' ' + transcript : transcript));
      }
    };

    rec.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      setIsListening(false);
      if (event.error === 'not-allowed') {
        alert("Permiso para usar el micrófono denegado. Por favor, actívalo en la configuración del navegador.");
      }
    };

    recognitionRef.current = rec;

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // Ignore errors during abort
        }
        recognitionRef.current.onstart = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current = null;
      }
    };
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert("El reconocimiento de voz no está soportado en este navegador.");
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      try {
        recognitionRef.current.start();
      } catch (err) {
        console.error("Failed to start speech recognition:", err);
      }
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const optimized = await ImageOptimizer.optimize(file);
      setAttachedImage(optimized);
      setSelectedTemplateKey(undefined);
    } catch (err) {
      console.error("Error al optimizar la imagen seleccionada:", err);
      alert("Error al optimizar la imagen seleccionada.");
    } finally {
      e.target.value = '';
    }
  };



  const borrarHistorial = async () => {
    if (!window.confirm("¿Estás seguro de que deseas vaciar el historial de chat de este consultor?")) {
      return;
    }
    try {
      await LocalDatabase.saveChatHistorial({
        id: activeConsultant,
        mensajes: [],
        ultimaActualizacion: new Date().toISOString()
      });
      onUpdate?.();
      
      let defaultText = '';
      if (activeConsultant === 'veterinario') {
        defaultText = 'Hola. Soy tu consultor de bienestar animal y prevención veterinaria. ¿En qué puedo asesorarte hoy con respecto al enriquecimiento del hogar o control clínico? Puedes adjuntar una foto de tu mascota o usar una plantilla rápida para analizar heridas o parásitos de forma preventiva.';
      } else if (activeConsultant === 'agronomo') {
        defaultText = 'Hola. Soy tu consultor agrónomo y paisajista. Estoy aquí para resolver dudas sobre microclimas domésticos, sustratos y requerimientos de cultivo. Puedes adjuntar una foto de tus plantas o usar una plantilla rápida para diagnosticar hojas marrones o plagas foliares.';
      } else {
        defaultText = 'Hola. Soy tu consultor especialista en animales exóticos. Puedo ayudarte con las condiciones ideales de temperatura y humedad para tu terrario, frecuencia de alimentación de reptiles y artrópodos, o control de mudas de piel. ¿Qué especie exótica tienes hoy?';
      }
      setMessages([{
        id: '1',
        sender: 'ia',
        text: defaultText,
        timestamp: new Date()
      }]);
    } catch (err) {
      console.error("Error clearing chat history:", err);
    }
  };

  const procesarMensaje = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() && !attachedImage) return;

    const currentText = inputText;
    const currentImage = attachedImage;
    const currentTemplate = selectedTemplateKey;

    const userMsg: ChatMessage = {
      id: safeUUID(),
      sender: 'user',
      text: currentText || "Análisis de imagen adjunta.",
      timestamp: new Date(),
      imageUrl: currentImage?.dataUrl
    };

    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInputText('');
    setAttachedImage(null);
    setSelectedTemplateKey(undefined);
    setLoadingIA(true);

    try {
      // Obtener datos de la base de datos local para inyectar como contexto
      const [mascotas, plantas, exoticos] = await Promise.all([
        LocalDatabase.getMascotas(),
        LocalDatabase.getPlantas(),
        LocalDatabase.getExoticos()
      ]);

      // Obtener coordenadas GPS y clima en vivo desde el caché local si está habilitado
      let gpsCoords = undefined;
      if (localStorage.getItem('petplant_gps_sync_enabled') === 'true') {
        const cachedWeather = localStorage.getItem('petplant_last_gps_weather');
        if (cachedWeather) {
          try {
            gpsCoords = JSON.parse(cachedWeather);
          } catch (e) {
            console.warn("Error al parsear el clima guardado en caché:", e);
          }
        }
      }

      const cleanHistoryForAPI: { sender: 'user' | 'ia'; text: string }[] = [];
      let expectedSender: 'user' | 'ia' = 'user';
      for (const m of messages) {
        if (m.sender === expectedSender) {
          cleanHistoryForAPI.push({
            sender: m.sender,
            text: m.text
          });
          expectedSender = expectedSender === 'user' ? 'ia' : 'user';
        }
      }
      if (cleanHistoryForAPI.length > 0 && cleanHistoryForAPI[cleanHistoryForAPI.length - 1].sender === 'user') {
        cleanHistoryForAPI.pop();
      }

      const res = await GeminiAPIService.analizarImagen(
        currentImage ? currentImage.blob : null,
        activeConsultant,
        currentText,
        currentTemplate,
        { mascotas, plantas, exoticos },
        gpsCoords,
        cleanHistoryForAPI
      );



      // NO navegar automáticamente — se muestra un botón en el mensaje para que el usuario decida

      const iaMsg: ChatMessage = {
        id: safeUUID(),
        sender: 'ia',
        text: res.diagnostico,
        timestamp: new Date(),
        diagnosticoClinico: {
          tratamiento: res.tratamiento,
          advertencia: res.advertencia,
          esUrgente: res.esUrgente,
          abrirFicha: res.abrirFicha || undefined
        }
      };

      const finalMessages = [...updatedMessages, iaMsg];
      setMessages(finalMessages);

      // Guardar en IndexedDB
      const chatHist = {
        id: activeConsultant,
        mensajes: finalMessages.map(m => ({
          id: m.id,
          remitente: (m.sender === 'user' ? 'usuario' : 'ia') as 'usuario' | 'ia',
          texto: m.text,
          fecha: m.timestamp.toISOString()
        })),
        ultimaActualizacion: new Date().toISOString()
      };
      await LocalDatabase.saveChatHistorial(chatHist);
      onUpdate?.();
    } catch (err) {
      console.error("Error al procesar el mensaje por IA:", err);
      alert("Lo siento, ha ocurrido un error al comunicarse con la IA. Por favor, inténtelo de nuevo.");
      // Restablecer estados al valor anterior
      setInputText(currentText);
      setAttachedImage(currentImage);
      setSelectedTemplateKey(currentTemplate);
      setMessages(messages);
    } finally {
      setLoadingIA(false);
    }
  };

  const renderCodecHeader = () => {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 16px',
        background: '#040d04',
        border: '2px solid #00ff00',
        borderRadius: '4px',
        marginBottom: '14px',
        color: '#00ff00',
        fontFamily: 'monospace',
        height: '76px',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '56px', height: '56px', border: '1px solid #00ff00', background: 'rgba(0,255,0,0.05)', justifyContent: 'center' }}>
          <span style={{ fontSize: '18px' }}>👤</span>
          <span style={{ fontSize: '8px', fontWeight: 'bold' }}>USUARIO</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, gap: '4px' }}>
          <span style={{ fontSize: '18px', fontWeight: 'bold', letterSpacing: '2px', color: '#33ff33' }}>140.85</span>
          <div style={{ display: 'flex', gap: '2px', height: '10px', width: '90px', alignItems: 'flex-end' }}>
            {freqBars.map((h, i) => (
              <div key={i} style={{ flex: 1, height: `${h}px`, background: '#33ff33' }} />
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '56px', height: '56px', border: '1px solid #00ff00', background: 'rgba(0,255,0,0.05)', justifyContent: 'center' }}>
          <span style={{ fontSize: '18px' }}>{activeConsultant === 'veterinario' ? '🩺' : '🌱'}</span>
          <span style={{ fontSize: '8px', fontWeight: 'bold', textTransform: 'uppercase' }}>
            {activeConsultant === 'veterinario' ? 'VET-IA' : 'AGRO-IA'}
          </span>
        </div>
      </div>
    );
  };

  const renderTratamientoIA = (m: ChatMessage) => {
    if (!m.diagnosticoClinico || !m.diagnosticoClinico.tratamiento.trim()) return null;
    
    if (theme === 'arcade') {
      return (
        <div style={{
          marginTop: '12px',
          background: 'linear-gradient(135deg, #000040 0%, #000000 100%)',
          border: '2px solid #fff',
          padding: '12px',
          color: '#fff',
          fontFamily: 'monospace'
        }}>
          <strong style={{ color: '#ffd700', fontSize: '11px', display: 'block', marginBottom: '6px', borderBottom: '1px solid #fff', paddingBottom: '4px' }}>
            ☞ RECOMENDACIÓN DE ACCIÓN
          </strong>
          <p style={{ margin: '0 0 8px 0', fontSize: '11px', whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>
            {m.diagnosticoClinico.tratamiento}
          </p>
          {m.diagnosticoClinico.advertencia && (
            <div style={{ padding: '6px', border: '1px solid #ff3b30', fontSize: '10px', color: '#ff3b30', background: 'rgba(255, 59, 48, 0.1)' }}>
              <strong>ALERTA:</strong> {m.diagnosticoClinico.advertencia}
            </div>
          )}
        </div>
      );
    }

    if (theme === 'terminal') {
      return (
        <div style={{
          marginTop: '12px',
          border: '1px dashed #33ff33',
          padding: '10px',
          color: '#33ff33',
          fontFamily: 'monospace'
        }}>
          <strong style={{ fontSize: '11px', display: 'block', marginBottom: '6px', borderBottom: '1px dashed #33ff33', paddingBottom: '4px' }}>
            * SISTEMA: PLAN DE INTERVENCIÓN
          </strong>
          <p style={{ margin: '0 0 8px 0', fontSize: '11px', whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>
            {m.diagnosticoClinico.tratamiento}
          </p>
          {m.diagnosticoClinico.advertencia && (
            <div style={{ padding: '6px', border: '1px solid #33ff33', fontSize: '10px', color: '#33ff33' }}>
              <strong>ATENCIÓN:</strong> {m.diagnosticoClinico.advertencia}
            </div>
          )}
        </div>
      );
    }

    return (
      <div style={{
        marginTop: '12px',
        background: theme === 'gaming' ? 'rgba(102, 252, 241, 0.05)' : 'var(--game-accent-light, rgba(0,0,0,0.02))',
        borderRadius: '8px',
        padding: '12px',
        border: '1px solid var(--game-border-color, #eaeaea)',
        color: theme === 'gaming' ? 'var(--game-text, #e0d0ff)' : 'var(--game-text, #333)'
      }}>
        <strong style={{ 
          color: theme === 'gaming' ? 'var(--game-accent, #66fcf1)' : 'var(--game-text-bright, #333)', 
          fontSize: '11px', 
          display: 'block', 
          marginBottom: '6px', 
          borderBottom: '1px solid var(--game-border-color, #eaeaea)', 
          paddingBottom: '4px' 
        }}>
          📋 ACCIÓN COMPATIBLE
        </strong>
        <p style={{ margin: '0 0 8px 0', fontSize: '11px', whiteSpace: 'pre-wrap', color: theme === 'gaming' ? 'var(--game-text, #e0d0ff)' : 'var(--game-text, #333)', lineHeight: '1.5' }}>
          {m.diagnosticoClinico.tratamiento}
        </p>
        {m.diagnosticoClinico.advertencia && (
          <div style={{
            padding: '8px',
            background: theme === 'gaming' ? 'rgba(251, 238, 9, 0.1)' : 'var(--game-accent-light, #fcfcfc)',
            borderRadius: '6px',
            fontSize: '10px',
            color: theme === 'gaming' ? 'var(--game-accent, #fbee09)' : 'var(--game-text-bright)',
            borderLeft: theme === 'gaming' ? '3px solid var(--game-accent, #fbee09)' : '3px solid var(--game-text-bright, #888)'
          }}>
            <strong>Atención Preventiva:</strong> {m.diagnosticoClinico.advertencia}
          </div>
        )}
        {m.diagnosticoClinico.abrirFicha && onNavigateToAsset && (
          <button
            type="button"
            onClick={() => onNavigateToAsset!(m.diagnosticoClinico!.abrirFicha!.tipo, m.diagnosticoClinico!.abrirFicha!.id)}
            style={{
              marginTop: '10px',
              padding: '6px 14px',
              background: 'var(--game-accent, #1976d2)',
              color: theme === 'gaming' ? '#000000' : '#ffffff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: 'bold',
              cursor: 'pointer',
              fontFamily: 'var(--game-font, sans-serif)'
            }}
          >
            📂 Ver ficha
          </button>
        )}
      </div>
    );
  };

  const renderBurbujaChat = (m: ChatMessage) => {
    const getSpeechText = (msg: ChatMessage) => {
      let t = msg.text;
      if (msg.diagnosticoClinico) {
        if (msg.diagnosticoClinico.tratamiento && msg.diagnosticoClinico.tratamiento.trim()) {
          t += "\n\nAcción recomendada: " + msg.diagnosticoClinico.tratamiento;
        }
        if (msg.diagnosticoClinico.advertencia && msg.diagnosticoClinico.advertencia.trim()) {
          t += "\n\nAtención preventiva: " + msg.diagnosticoClinico.advertencia;
        }
      }
      return t;
    };

    if (theme === 'arcade') {
      return (
        <div key={m.id} style={{
          alignSelf: m.sender === 'user' ? 'flex-end' : 'flex-start',
          background: 'linear-gradient(135deg, #000080 0%, #000000 100%)',
          border: '3px solid #ffffff',
          boxShadow: '0 0 0 2px #000, 0 4px 10px rgba(0,0,0,0.8)',
          borderRadius: '4px',
          padding: '14px',
          color: '#fff',
          fontFamily: 'monospace',
          fontSize: '13px',
          maxWidth: '80%',
          position: 'relative'
        }}>
          {m.sender === 'ia' && <span style={{ position: 'absolute', left: '-18px', top: '14px', fontSize: '14px', color: '#fff' }}>☞</span>}
          {m.imageUrl && (
            <div style={{ marginBottom: '8px', maxWidth: '240px', overflow: 'hidden', border: '1px solid #fff', background: '#000' }}>
              <img src={m.imageUrl} alt="Adjunto" style={{ width: '100%', display: 'block', objectFit: 'contain', height: 'auto', maxHeight: '220px' }} />
            </div>
          )}
          <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.4' }}>{m.text}</div>
          {m.sender === 'ia' && (
            <div style={{ marginTop: '6px' }}>
              <TTSButton text={getSpeechText(m)} theme={theme} size="small" />
            </div>
          )}
          {renderTratamientoIA(m)}
          <div style={{ fontSize: '9px', opacity: 0.6, marginTop: '6px', textAlign: 'right' }}>
            {m.timestamp.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      );
    }

    if (theme === 'terminal') {
      return (
        <div key={m.id} style={{
          alignSelf: 'flex-start',
          color: '#33ff33',
          fontFamily: 'monospace',
          fontSize: '13px',
          padding: '8px 0',
          borderBottom: '1px dashed rgba(51, 255, 51, 0.3)',
          width: '100%'
        }}>
          {m.sender === 'user' ? '> USUARIO: ' : '> SISTEMA: '}
          {m.imageUrl && (
            <div style={{ margin: '8px 0', maxWidth: '240px', overflow: 'hidden', border: '1px solid #33ff33', background: '#000' }}>
              <img src={m.imageUrl} alt="Adjunto" style={{ width: '100%', display: 'block', objectFit: 'contain', height: 'auto', maxHeight: '220px', filter: 'grayscale(100%) brightness(80%) sepia(100%) hue-rotate(50deg) saturate(1000%)' }} />
            </div>
          )}
          <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.4' }}>{m.text}</div>
          {m.sender === 'ia' && <TTSButton text={getSpeechText(m)} theme={theme} size="small" />}
          {renderTratamientoIA(m)}
          <div style={{ fontSize: '9px', opacity: 0.6, marginTop: '6px', textAlign: 'right' }}>
            {m.timestamp.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      );
    }

    // Default theme — burbuja de chat
    return (
      <div key={m.id} style={{
        alignSelf: m.sender === 'user' ? 'flex-end' : 'flex-start',
        background: m.sender === 'user' 
          ? (theme === 'gaming' ? 'rgba(51, 243, 255, 0.15)' : 'var(--game-accent-light, rgba(0,0,0,0.05))') 
          : (theme === 'gaming' ? 'var(--game-card-bg, #1f2833)' : '#ffffff'),
        border: m.sender === 'user'
          ? '2px solid var(--game-border-color, #66fcf1)'
          : (theme === 'gaming' ? '1px solid var(--game-border-color, #66fcf1)' : '1px solid rgba(0, 0, 0, 0.12)'),
        borderRadius: 'var(--game-radius, 12px)',
        color: theme === 'gaming'
          ? (m.sender === 'user' ? 'var(--game-text-bright, #66fcf1)' : 'var(--game-text, #e0d0ff)')
          : (m.sender === 'user' ? 'var(--game-text-bright, #333)' : '#1f2937'),
        padding: '10px 14px',
        fontSize: '13px',
        fontFamily: 'var(--game-font, sans-serif)',
        maxWidth: '85%',
        boxShadow: m.sender === 'ia' ? (theme === 'gaming' ? '0 2px 12px rgba(102, 252, 241, 0.2)' : '0 2px 8px rgba(0,0,0,0.08)') : 'none'
      }}>
        {m.imageUrl && (
          <div style={{ marginBottom: '8px', maxWidth: '280px', overflow: 'hidden', borderRadius: '4px', border: '1px solid var(--game-border-color)', background: '#111' }}>
            <img src={m.imageUrl} alt="Adjunto" style={{ width: '100%', display: 'block', objectFit: 'contain', height: 'auto', maxHeight: '240px' }} />
          </div>
        )}
        <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.4' }}>{m.text}</div>
        {m.sender === 'ia' && (
          <div style={{ marginTop: '6px' }}>
            <TTSButton text={getSpeechText(m)} theme={theme} size="small" />
          </div>
        )}
        {renderTratamientoIA(m)}
        <div style={{ fontSize: '9px', opacity: 0.6, marginTop: '6px', textAlign: 'right', color: m.sender === 'user' ? 'var(--game-text)' : '#78909c' }}>
          {m.timestamp.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    );
  };

  return (
    <div className="ia-view-wrapper" style={{
      width: '100%',
      maxWidth: '100%',
      fontFamily: 'var(--game-font, sans-serif)',
      color: 'var(--game-text, #333)',
      boxSizing: 'border-box'
    }}>
      {/* Spacer izquierdo para centrado en grid */}
      <div className="chat-spacer-left" />

      {/* Contenedor del Chat */}
      <div 
        className="ia-chat-container" 
        onDragEnter={handleDragEnter}
        onDragOver={(e) => e.preventDefault()}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{
          minWidth: 0,
          width: '100%',
          background: 'var(--game-card-bg, #ffffff)',
          borderRadius: theme === 'arcade' || theme === 'terminal' ? '0px' : '16px',
          border: 'var(--game-border, 1px solid #f0f0f0)',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          height: 'calc(100vh - 340px)',
          maxHeight: '520px',
          minHeight: '320px',
          boxShadow: theme === 'terminal' ? 'none' : '0 4px 20px rgba(0,0,0,0.05)',
          position: 'relative',
          boxSizing: 'border-box'
        }}
      >
        {/* Drag and drop overlay feedback */}
        {isDragging && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(46, 125, 50, 0.15)',
            border: '3px dashed #2e7d32',
            borderRadius: theme === 'arcade' || theme === 'terminal' ? '0px' : '16px',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none'
          }}>
            <div style={{
              background: '#fff',
              padding: '16px 24px',
              borderRadius: '8px',
              boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
              textAlign: 'center',
              fontWeight: 'bold',
              color: '#2e7d32',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span style={{ fontSize: '24px' }}>📸</span>
              <span>¡Suelta la foto aquí para analizarla!</span>
            </div>
          </div>
        )}
        {/* Cabecera y Selector de Consultor */}
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '12px', 
          borderBottom: 'var(--game-border, 1px solid #f0f0f0)', 
          paddingBottom: '12px', 
          marginBottom: '12px',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%'
        }}>
          {!hideSelector ? (
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'center', width: '100%' }}>
              <button
                type="button"
                onClick={() => { setActiveConsultant('veterinario'); setAttachedImage(null); }}
                style={{
                  padding: '8px 16px',
                  background: activeConsultant === 'veterinario' ? 'var(--game-accent-light, #e3f2fd)' : 'var(--game-bg, #f5f5f5)',
                  color: activeConsultant === 'veterinario' ? 'var(--game-text-bright, #1976d2)' : 'var(--game-text, #555)',
                  border: 'var(--game-border, none)',
                  borderRadius: theme === 'arcade' ? '0px' : '8px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontFamily: 'var(--game-font, sans-serif)',
                  whiteSpace: 'nowrap'
                }}
              >
                🐾 Veterinario
              </button>
              <button
                type="button"
                onClick={() => { setActiveConsultant('agronomo'); setAttachedImage(null); }}
                style={{
                  padding: '8px 16px',
                  background: activeConsultant === 'agronomo' ? 'var(--game-accent-light, #e8f5e9)' : 'var(--game-bg, #f5f5f5)',
                  color: activeConsultant === 'agronomo' ? 'var(--game-text-bright, #2e7d32)' : 'var(--game-text, #555)',
                  border: 'var(--game-border, none)',
                  borderRadius: theme === 'arcade' ? '0px' : '8px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontFamily: 'var(--game-font, sans-serif)',
                  whiteSpace: 'nowrap'
                }}
              >
                🌿 Agrónomo
              </button>
              <button
                type="button"
                onClick={() => { setActiveConsultant('exoticos'); setAttachedImage(null); }}
                style={{
                  padding: '8px 16px',
                  background: activeConsultant === 'exoticos' ? 'var(--game-accent-light, #fff8e1)' : 'var(--game-bg, #f5f5f5)',
                  color: activeConsultant === 'exoticos' ? 'var(--game-text-bright, #ff8f00)' : 'var(--game-text, #555)',
                  border: 'var(--game-border, none)',
                  borderRadius: theme === 'arcade' ? '0px' : '8px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontFamily: 'var(--game-font, sans-serif)',
                  whiteSpace: 'nowrap'
                }}
              >
                🦎 Exóticos
              </button>
            </div>
          ) : (
            <h3 style={{ margin: '0', fontSize: '14px', color: activeConsultant === 'veterinario' ? '#1976d2' : activeConsultant === 'exoticos' ? '#ff8f00' : '#2e7d32', fontWeight: 'bold', fontFamily: 'var(--game-font, sans-serif)', textAlign: 'center' }}>
              {activeConsultant === 'veterinario' ? '🐾 Consultor Veterinario' : activeConsultant === 'exoticos' ? '🦎 Especialista en Exóticos' : '🌿 Consultor Agrónomo'}
            </h3>
          )}

          {/* Fila Centrada de Acciones: Badge de Estado + Botón Limpiar Chat */}
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', justifyContent: 'center', width: '100%', flexWrap: 'wrap' }}>
            {(() => {
              const hasApiKey = !!GeminiAPIService.getApiKey();
              if (theme === 'terminal') {
                return (
                  <div style={{
                    fontSize: '11px',
                    color: hasApiKey ? '#33ff33' : '#ffb300',
                    fontFamily: 'monospace',
                    border: `1px dashed ${hasApiKey ? '#33ff33' : '#ffb300'}`,
                    padding: '2px 6px'
                  }}>
                    {hasApiKey ? '[STATUS: PREMIUM_REAL_IA]' : '[STATUS: OFFLINE_DEMO_SIM]'}
                  </div>
                );
              }
              if (theme === 'arcade') {
                return (
                  <div style={{
                    fontSize: '11px',
                    color: hasApiKey ? '#00ffff' : '#ff00ff',
                    fontFamily: 'monospace',
                    textShadow: `0 0 5px ${hasApiKey ? '#00ffff' : '#ff00ff'}`,
                    border: `1px solid ${hasApiKey ? '#00ffff' : '#ff00ff'}`,
                    padding: '2px 6px',
                    background: 'rgba(0,0,0,0.5)'
                  }}>
                    {hasApiKey ? '💎 IA REAL' : '👾 SIMULADOR'}
                  </div>
                );
              }
              if (theme === 'adventure') {
                return (
                  <div style={{
                    fontSize: '10px',
                    fontWeight: 'bold',
                    color: hasApiKey ? '#00ff00' : '#ffcc00',
                    border: `1px solid ${hasApiKey ? '#00ff00' : '#ffcc00'}`,
                    padding: '2px 6px',
                    background: 'rgba(0, 0, 0, 0.4)',
                    fontFamily: 'monospace',
                    letterSpacing: '1px'
                  }}>
                    {hasApiKey ? 'REAL_IA' : 'SIMULATION'}
                  </div>
                );
              }
              return (
                <div style={{
                  fontSize: '11px',
                  fontWeight: 'bold',
                  color: hasApiKey ? '#2e7d32' : '#d84315',
                  background: hasApiKey ? 'rgba(46, 125, 50, 0.08)' : 'rgba(216, 67, 21, 0.08)',
                  border: `1px solid ${hasApiKey ? 'rgba(46, 125, 50, 0.3)' : 'rgba(216, 67, 21, 0.3)'}`,
                  padding: '4px 10px',
                  borderRadius: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }} title={hasApiKey ? "IA de Gemini activa (Consulta Real)" : "Modo demostración offline (Configura tu API Key en Ajustes ⚙️)"}>
                  <span>{hasApiKey ? '💎' : '⚠️'}</span>
                  <span>{hasApiKey ? 'Consulta Real' : 'Consulta Simulada'}</span>
                </div>
              );
            })()}

            <button
              type="button"
              onClick={borrarHistorial}
              style={{
                padding: '6px 12px',
                background: 'transparent',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                borderRadius: theme === 'arcade' ? '0px' : '6px',
                color: '#ef4444',
                fontSize: '11px',
                fontWeight: 'bold',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontFamily: 'var(--game-font, sans-serif)',
                transition: 'all 0.2s'
              }}
              title="Borrar todo el historial de chat para este consultor"
            >
              🗑️ Limpiar Chat
            </button>
          </div>
        </div>

        {/* MGS Codec Panel when in Adventure theme */}
        {theme === 'adventure' && renderCodecHeader()}

        {/* Historial de Mensajes */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', paddingRight: '6px', marginBottom: '12px' }}>
          {activeHistory.map(m => renderBurbujaChat(m))}
          {loadingIA && (
            <div style={{
              alignSelf: 'flex-start',
              background: theme === 'terminal' ? 'transparent' : 'var(--game-accent-light, #f5f5f5)',
              border: theme === 'terminal' ? '1px dashed #33ff33' : 'var(--game-border, none)',
              borderRadius: theme === 'arcade' ? '0px' : '12px',
              padding: '10px 14px',
              fontSize: '13px',
              color: 'var(--game-text-bright, #666)',
              fontStyle: 'italic',
              fontFamily: 'var(--game-font, monospace)'
            }}>
              {theme === 'terminal' 
                ? '> ANALIZANDO_CONSULTA...' 
                : attachedImage
                  ? 'El consultor está examinando minuciosamente la fisiopatología de la imagen...'
                  : 'El consultor está analizando tu consulta...'}
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Previsualizador de Imagen Adjunta */}
        {attachedImage && (
          <div style={{
            position: 'absolute',
            bottom: '72px',
            left: '20px',
            background: 'var(--game-card-bg, #ffffff)',
            border: 'var(--game-border, 1px solid #eaeaea)',
            borderRadius: theme === 'arcade' ? '0px' : '10px',
            padding: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 4px 15px rgba(0,0,0,0.08)',
            zIndex: 5
          }}>
            <img src={attachedImage.dataUrl} alt="Thumbnail preview" style={{ width: '40px', height: '40px', borderRadius: '4px', objectFit: 'cover' }} />
            <span style={{ fontSize: '11px', color: 'var(--game-text, #555)', fontWeight: 'bold' }}>
              {selectedTemplateKey ? 'Plantilla de Simulación' : 'Foto Física Optimizada'}
            </span>
            <button
              onClick={() => { setAttachedImage(null); setSelectedTemplateKey(undefined); }}
              style={{ border: 'none', background: '#f5f5f5', color: '#333', borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '10px' }}
            >
              ✕
            </button>
          </div>
        )}

        {/* Barra de Entrada y Selector de Adjuntos */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <form onSubmit={procesarMensaje} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            
            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              style={{
                width: '38px',
                height: '38px',
                borderRadius: theme === 'arcade' ? '0px' : '8px',
                background: 'var(--game-bg, #fafafa)',
                border: 'var(--game-border, 1px solid #eaeaea)',
                cursor: 'pointer',
                fontSize: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 0.2s',
                flexShrink: 0
              }}
              title="Adjuntar Imagen Real"
            >
              📎
            </button>

            {/* Microphone voice dictation button */}
            {typeof window !== 'undefined' && 
             ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition) && (
              <button
                type="button"
                onClick={toggleListening}
                className={isListening ? "mic-active-pulse" : ""}
                aria-label="Dictar por voz"
                aria-pressed={isListening}
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: theme === 'arcade' ? '0px' : '8px',
                  background: isListening 
                    ? 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)' 
                    : 'var(--game-bg, #fafafa)',
                  color: isListening ? '#fff' : 'var(--game-text-bright, #333)',
                  border: isListening ? 'none' : 'var(--game-border, 1px solid #eaeaea)',
                  cursor: 'pointer',
                  fontSize: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s',
                  flexShrink: 0
                }}
                title="Dictar por Voz 🎙️"
              >
                🎙️
              </button>
            )}

            <input
              type="text"
              placeholder={
                isListening
                  ? "Escuchando... Hable ahora 🎙️"
                  : activeConsultant === 'veterinario'
                    ? "Pregunta sobre heridas, pulgas, garrapatas o dieta..."
                    : "Pregunta sobre hojas amarillas, riego, sustratos..."
              }
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              disabled={loadingIA}
              style={{
                flex: 1,
                minWidth: 0,
                padding: '10px 14px',
                background: 'var(--game-bg, #ffffff)',
                color: 'var(--game-text-bright, #333)',
                border: 'var(--game-border, 1px solid #eaeaea)',
                borderRadius: theme === 'arcade' ? '0px' : '8px',
                fontSize: '13px',
                fontFamily: 'var(--game-font, sans-serif)',
                outline: 'none'
              }}
            />
            
            <button 
              type="submit" 
              disabled={loadingIA || (!inputText.trim() && !attachedImage)} 
              style={{
                padding: '10px 20px',
                background: theme === 'terminal' ? 'transparent' : 'var(--game-accent, #2196f3)',
                color: theme === 'terminal' ? '#33ff33' : theme === 'adventure' ? '#000000' : '#fff',
                border: 'var(--game-border, none)',
                borderRadius: theme === 'arcade' ? '0px' : '8px',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '13px',
                opacity: (loadingIA || (!inputText.trim() && !attachedImage)) ? 0.6 : 1,
                fontFamily: 'var(--game-font, sans-serif)',
                flexShrink: 0
              }}
            >
              {loadingIA ? (theme === 'terminal' ? 'ANALIZANDO...' : 'Analizando...') : (theme === 'terminal' ? 'ENVIAR >' : 'Enviar')}
            </button>
          </form>


        </div>

      </div>

      {/* Spacer derecho para centrado en grid */}
      <div className="chat-spacer-right" />
    </div>
  );
};
