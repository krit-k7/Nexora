import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface AIAssistantProps {
  logic: string;
}

const AIAssistant: React.FC<AIAssistantProps> = ({ logic }) => {
  const [analyzing, setAnalyzing] = useState(false);
  const [suggestion, setSuggestion] = useState<string | null>(null);

  const analyzeLogic = () => {
    setAnalyzing(true);
    setTimeout(() => {
      setAnalyzing(false);
      setSuggestion(
        logic.length > 10 
          ? "Analysis Complete: Predicate is efficient. Recommended optimization: Ensure the 'targetChain' matches the storage layout of the source contract." 
          : "Logic is currently insufficient. Please define a Boolean predicate to enable attestation."
      );
    }, 1500);
  };

  return (
    <div className="p-8 rounded-[2.5rem] bg-neutral-600/10 border border-neutral-500/20 relative overflow-hidden group">
      <div className="absolute top-0 right-0 w-24 h-24 bg-neutral-500/10 blur-3xl rounded-full" />
      {analyzing && <div className="absolute inset-0 animate-shimmer pointer-events-none" />}
      
      <div className="flex items-center gap-3 mb-6 relative z-10">
        <div className="w-2 h-2 bg-neutral-400 rounded-full animate-pulse" />
        <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Zypher_AI Assistant</span>
      </div>

      <p className="text-xs text-slate-400 mb-6 font-medium leading-relaxed relative z-10">
        Our integrated intelligence scans your logic for gas efficiency and cross-chain compatibility.
      </p>

      <button 
        onClick={analyzeLogic}
        disabled={analyzing}
        className="w-full py-4 bg-neutral-600 text-white rounded-2xl font-bold text-[10px] uppercase tracking-[0.2em] shadow-lg shadow-neutral-600/20 active:scale-95 transition-all disabled:opacity-50 relative z-10 overflow-hidden"
      >
        <span className="relative z-10">{analyzing ? 'Processing Logic...' : 'Analyze Predicate'}</span>
        {analyzing && <div className="absolute inset-0 bg-white/10 animate-shimmer" />}
      </button>

      <AnimatePresence>
        {suggestion && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-6 p-4 rounded-xl bg-neutral-950/40 border border-neutral-500/20 relative z-10"
          >
            <p className="text-[10px] text-neutral-300 font-bold leading-relaxed">
              {suggestion}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AIAssistant;
