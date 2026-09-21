import React, { useEffect } from 'react';

export default function Toast({ message, type = 'success', onClose }) {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose();
        }, 3500); // O toast some sozinho após 3.5 segundos
        return () => clearTimeout(timer);
    }, [onClose]);

    const bgColors = {
        success: 'bg-emerald-950/90 border-emerald-500/50 text-emerald-200',
        error: 'bg-red-950/90 border-red-500/50 text-red-200',
        info: 'bg-sky-950/90 border-sky-500/50 text-sky-200'
    };

    const icons = {
        success: '✅',
        error: '❌',
        info: 'ℹ️'
    };

    return (
        <div className={`fixed bottom-6 left-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl border shadow-2xl backdrop-blur-md text-xs font-semibold animate-bounce-in ${bgColors[type] || bgColors.success}`}>
            <span className="text-sm">{icons[type] || '✅'}</span>
            <span>{message}</span>
        </div>
    );
}