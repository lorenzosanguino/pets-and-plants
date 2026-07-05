/* eslint-disable react-refresh/only-export-components */
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useTranslations } from './i18n';

export const useTTS = () => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const playCurrentRef = useRef<() => void>(() => {});
  const [currentRate, setCurrentRate] = useState<number>(1.15); // Velocidad normal por defecto
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const sentencesQueueRef = useRef<string[]>([]);
  const currentSentenceIndexRef = useRef<number>(0);
  const activeSpeakingRef = useRef<boolean>(false);
  const rateRef = useRef<number>(1.15);

  const cleanUtterance = (utt: SpeechSynthesisUtterance) => {
    if (typeof window !== 'undefined' && (window as any)._activeUtterances) {
      (window as any)._activeUtterances = (window as any)._activeUtterances.filter((u: any) => u !== utt);
    }
  };

  const playCurrent = useCallback(() => {
    if (!activeSpeakingRef.current || !window.speechSynthesis) return;

    if (currentSentenceIndexRef.current >= sentencesQueueRef.current.length) {
      setIsSpeaking(false);
      activeSpeakingRef.current = false;
      return;
    }

    const sentenceText = sentencesQueueRef.current[currentSentenceIndexRef.current];
    const utterance = new SpeechSynthesisUtterance(sentenceText);
    const savedLocale = (typeof window !== 'undefined' ? localStorage.getItem('petplant_locale') : null) || 'es';
    utterance.lang = savedLocale === 'en' ? 'en-US' : 'es-ES';
    utterance.rate = rateRef.current;
    utterance.pitch = 1;
    utterance.volume = 1;

    const voices = window.speechSynthesis.getVoices();
    const voice = voices.find(v => v.lang.startsWith(savedLocale));
    if (voice) utterance.voice = voice;

    utterance.onend = () => {
      cleanUtterance(utterance);
      if (!activeSpeakingRef.current) {
        setIsSpeaking(false);
        return;
      }
      currentSentenceIndexRef.current++;
      playCurrentRef.current();
    };

    utterance.onerror = (e) => {
      cleanUtterance(utterance);
      console.error("Error en reproducción TTS de fragmento:", e);
      if (!activeSpeakingRef.current) {
        setIsSpeaking(false);
        return;
      }
      currentSentenceIndexRef.current++;
      playCurrentRef.current();
    };

    // Almacenar en objeto global para evitar recolección de basura
    if (typeof window !== 'undefined') {
      (window as any)._activeUtterances = (window as any)._activeUtterances || [];
      (window as any)._activeUtterances.push(utterance);
    }

    utteranceRef.current = utterance;
    window.speechSynthesis.resume(); // Evitar estado pausado/bloqueado
    window.speechSynthesis.speak(utterance);
  }, []);

  useEffect(() => {
    playCurrentRef.current = playCurrent;
  }, [playCurrent]);

  const stop = useCallback(() => {
    activeSpeakingRef.current = false;
    if (window.speechSynthesis) {
      window.speechSynthesis.resume(); // Asegurar que no está pausado antes de cancelar
      window.speechSynthesis.cancel();
    }
    if (typeof window !== 'undefined') {
      (window as any)._activeUtterances = [];
    }
    setIsSpeaking(false);
  }, []);

  const speak = useCallback((text: string) => {
    if (!window.speechSynthesis) return;

    window.speechSynthesis.resume(); // Asegurar que no está pausado
    window.speechSynthesis.cancel(); // Detener cualquier reproducción previa de inmediato

    if (isSpeaking) {
      stop();
      return;
    }

    const cleanText = text
      .replace(/\p{Extended_Pictographic}/gu, '')
      .replace(/[\u{1F300}-\u{1F9FF}]/gu, '')
      .replace(/[\u{2700}-\u{27BF}]/gu, '')
      .replace(/[\u{2600}-\u{26FF}]/gu, '')
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/#{1,6}\s/g, '')
      .replace(/`(.*?)`/g, '$1')
      .replace(/\*/g, '')
      .replace(/-\s+/g, '')
      .replace(/•\s+/g, '')
      .trim();

    // Segmentar en oraciones cortas o fragmentos para evitar límites del navegador
    const sentences = cleanText
      .split(/(?<=[.!?])\s+|\n+/)
      .map(s => s.trim())
      .filter(s => s.length > 0);

    if (sentences.length === 0) return;

    setIsSpeaking(true);
    activeSpeakingRef.current = true;
    sentencesQueueRef.current = sentences;
    currentSentenceIndexRef.current = 0;

    playCurrent();
  }, [isSpeaking, stop, playCurrent]);

  const setSpeed = useCallback((newRate: number) => {
    rateRef.current = newRate;
    setCurrentRate(newRate);
    if (activeSpeakingRef.current && window.speechSynthesis) {
      if (utteranceRef.current) {
        utteranceRef.current.onend = null;
        utteranceRef.current.onerror = null;
      }
      window.speechSynthesis.resume();
      window.speechSynthesis.cancel();
      playCurrent();
    }
  }, [playCurrent]);

  // Silenciar automáticamente si el usuario cambia de pestaña o minimiza la app
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        stop();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [stop]);

  // Limpieza al desmontar el hook
  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  const isSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  return { speak, stop, isSpeaking, isSupported, rate: currentRate, setSpeed };
};

interface TTSButtonProps {
  text: string;
  theme?: string;
  size?: 'small' | 'normal';
}

export const TTSButton: React.FC<TTSButtonProps> = ({ text, theme = 'nature', size = 'small' }) => {
  const { speak, isSpeaking, isSupported, rate, setSpeed } = useTTS();
  const { locale } = useTranslations();
  if (!isSupported || !text?.trim()) return null;

  const isSmall = size === 'small';

  return (
    <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
      <button
        type="button"
        onClick={() => speak(text)}
        title={isSpeaking ? (locale === 'en' ? 'Stop reading' : 'Detener lectura') : (locale === 'en' ? 'Listen to response' : 'Escuchar respuesta')}
        style={{
          padding: isSmall ? '3px 8px' : '5px 12px',
          background: isSpeaking ? 'rgba(239,68,68,0.1)' : 'rgba(0,0,0,0.04)',
          border: `1px solid ${isSpeaking ? '#ef4444' : 'rgba(0,0,0,0.12)'}`,
          borderRadius: theme === 'gaming' ? '0px' : '6px',
          fontSize: isSmall ? '11px' : '12px',
          cursor: 'pointer',
          color: isSpeaking ? '#ef4444' : 'var(--game-text-bright, #555)',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          fontFamily: 'var(--game-font, sans-serif)',
          transition: 'all 0.2s',
          flexShrink: 0
        }}
      >
        {isSpeaking ? (locale === 'en' ? '⏹ Stop' : '⏹ Detener') : (locale === 'en' ? '🔊 Listen' : '🔊 Escuchar')}
      </button>

      {isSpeaking && (
        <button
          type="button"
          onClick={() => setSpeed(rate === 1.5 ? 1.15 : 1.5)}
          title={locale === 'en' ? 'Toggle reading speed (x1.15 / x1.5)' : 'Alternar velocidad de lectura (x1.15 / x1.5)'}
          style={{
            padding: isSmall ? '3px 8px' : '5px 12px',
            background: rate === 1.5 
              ? (theme === 'terminal' ? 'transparent' : 'rgba(76,175,80,0.1)') 
              : 'rgba(0,0,0,0.04)',
            border: `1px solid ${
              rate === 1.5 
                ? (theme === 'terminal' ? '#33ff33' : '#4caf50') 
                : 'rgba(0,0,0,0.12)'
            }`,
            borderRadius: theme === 'gaming' ? '0px' : '6px',
            fontSize: isSmall ? '11px' : '12px',
            cursor: 'pointer',
            color: rate === 1.5 
              ? (theme === 'terminal' ? '#33ff33' : '#4caf50') 
              : 'var(--game-text-bright, #555)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            fontFamily: 'var(--game-font, sans-serif)',
            transition: 'all 0.2s',
            fontWeight: 'bold',
            flexShrink: 0
          }}
        >
          <span>⚡</span> x1.5
        </button>
      )}
    </div>
  );
};
