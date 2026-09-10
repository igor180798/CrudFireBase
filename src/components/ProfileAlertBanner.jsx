import React from 'react';

export default function ProfileAlertBanner({ onOpenModal }) {
  return (
    <div className="bg-amber-500/10 border-b border-amber-500/30 text-amber-200 px-4 py-3">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
        <div className="flex items-center gap-2 text-sm md:text-base">
          <span className="text-amber-400 font-bold">⚠️</span>
          <span>Seu perfil está incompleto! Atualize seus dados para continuar usando o sistema.</span>
        </div>
        <button
          onClick={onOpenModal}
          className="w-full sm:w-auto bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold px-4 py-1.5 rounded text-sm transition shadow-sm whitespace-nowrap"
        >
          Completar Perfil
        </button>
      </div>
    </div>
  );
}