// src/components/ui/LoadingScreen.jsx
import { Flame } from 'lucide-react';

export default function LoadingScreen({ message = 'Carregando dados...' }) {
  return (
    <div className="fixed inset-0 bg-surface-base flex flex-col items-center justify-center z-50">
      <div className="flex flex-col items-center gap-5">
        {/* Animated logo */}
        <div className="relative">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-olive to-brand-amber flex items-center justify-center shadow-lg animate-pulse">
            <Flame size={26} className="text-white" />
          </div>
          <div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-brand-olive to-brand-amber opacity-20 blur-md animate-pulse" />
        </div>

        <div className="text-center">
          <p className="text-sm font-semibold text-brand-black font-display">Quintal do Espeto</p>
          <p className="text-xs text-zinc-400 mt-1">{message}</p>
        </div>

        {/* Progress bar */}
        <div className="w-40 h-1 bg-surface-muted rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-brand-olive to-brand-amber rounded-full animate-[loading_1.4s_ease-in-out_infinite]" />
        </div>
      </div>

      <style>{`
        @keyframes loading {
          0%   { width: 0%;   margin-left: 0; }
          50%  { width: 60%;  margin-left: 20%; }
          100% { width: 0%;   margin-left: 100%; }
        }
      `}</style>
    </div>
  );
}

export function ErrorScreen({ error }) {
  return (
    <div className="fixed inset-0 bg-surface-base flex items-center justify-center">
      <div className="text-center max-w-md px-6">
        <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center mx-auto mb-4">
          <span className="text-rose-500 text-xl">⚠</span>
        </div>
        <h2 className="text-lg font-semibold text-brand-black font-display mb-2">
          Erro ao carregar dados
        </h2>
        <p className="text-sm text-zinc-500 mb-4">
          Não foi possível carregar o arquivo de dados. Verifique se o arquivo
          <code className="mx-1 px-1.5 py-0.5 bg-surface-muted rounded text-xs font-mono">public/data.csv</code>
          existe ou se a URL do Google Sheets está correta.
        </p>
        <p className="text-xs text-zinc-400 font-mono bg-surface-muted px-3 py-2 rounded-lg">
          {error?.message || String(error)}
        </p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-brand-black text-white text-sm font-medium rounded-lg hover:bg-zinc-800 transition-colors"
        >
          Tentar novamente
        </button>
      </div>
    </div>
  );
}
