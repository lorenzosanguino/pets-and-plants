import React, { useState, useCallback, useRef } from 'react';

export const useTTS = () => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const sentencesQueueRef = useRef<string[]>([]);
  const currentSentenceIndexRef = useRef<number>(0);

  const stop = useCallback(() => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  }, []);

  const speak = useCallback((text: string) => {
    if (!window.speechSynthesis) return;

    // Detener cualquier reproducción previa de inmediato
    window.speechSynthesis.cancel();

    if (isSpeaking) {
      setIsSpeaking(false);
      return;
    }

    const cleanText = text
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/#{1,6}\s/g, '')
      .replace(/`(.*?)`/g, '$1')
      .trim();

    // Segmentar en oraciones cortas o fragmentos para evitar límites del navegador
    const sentences = cleanText
      .split(/(?<=[.!?])\s+|\n+/)
      .map(s => s.trim())
      .filter(s => s.length > 0);

    if (sentences.length === 0) return;

    setIsSpeaking(true);
    sentencesQueueRef.current = sentences;
    currentSentenceIndexRef.current = 0;

    const speakNext = () => {
      if (currentSentenceIndexRef.current >= sentencesQueueRef.current.length) {
        setIsSpeaking(false);
        return;
      }

      const sentenceText = sentencesQueueRef.current[currentSentenceIndexRef.current];
      const utterance = new SpeechSynthesisUtterance(sentenceText);
      utterance.lang = 'es-ES';
      utterance.rate = 0.95;
      utterance.pitch = 1;
      utterance.volume = 1;

      const voices = window.speechSynthesis.getVoices();
      const spanishVoice = voices.find(v => v.lang.startsWith('es'));
      if (spanishVoice) utterance.voice = spanishVoice;

      utterance.onend = () => {
        currentSentenceIndexRef.current++;
        speakNext();
      };

      utterance.onerror = (e) => {
        console.error("Error en reproducción TTS de fragmento:", e);
        currentSentenceIndexRef.current++;
        speakNext();
      };

      utteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    };

    speakNext();
  }, [isSpeaking]);

  const isSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  return { speak, stop, isSpeaking, isSupported };
};

interface TTSButtonProps {
  text: string;
  theme?: string;
  size?: 'small' | 'normal';
}

export const TTSButton: React.FC<TTSButtonProps> = ({ text, theme = 'nature', size = 'small' }) => {
  const { speak, isSpeaking, isSupported } = useTTS();
  if (!isSupported || !text?.trim()) return null;

  const isSmall = size === 'small';

  return (
    <button
      type="button"
      onClick={() => speak(text)}
      title={isSpeaking ? 'Detener lectura' : 'Escuchar respuesta'}
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
      {isSpeaking ? '⏹ Detener' : '🔊 Escuchar'}
    </button>
  );
};
