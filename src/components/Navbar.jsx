import React from 'react';
import { Link } from 'react-router-dom';

export default function Navbar({ usuario, carrinhoCount, onLogout }) {
    return (
        <nav className="bg-[#131a27] border-b border-slate-800 px-6 py-3.5 flex justify-between items-center text-xs sticky top-0 z-40 backdrop-blur-md bg-opacity-95">
            <div className="flex items-center gap-6">
                <Link to="/" className="flex items-center gap-2">
                    <span className="text-sky-400 font-bold text-sm tracking-wide">SneakerStore</span>
                </Link>

                <div className="hidden sm:flex items-center gap-4 text-slate-300 font-medium">
                    <Link to="/" className="hover:text-sky-400 transition">Catálogo</Link>
                    <Link to="/admin" className="hover:text-amber-400 transition font-semibold">
                        Painel Admin
                    </Link>
                </div>
            </div>

            <div className="flex items-center gap-3">
                <span className="text-slate-400 hidden md:inline">
                    Olá, <strong className="text-sky-400">{usuario.email}</strong>
                </span>

                <Link
                    to="/carrinho"
                    className="bg-sky-600 hover:bg-sky-500 text-white font-bold px-3.5 py-2 rounded-lg transition flex items-center gap-1.5 shadow-md"
                >
                    🛒 Carrinho ({carrinhoCount})
                </Link>

                <button
                    onClick={onLogout}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-3.5 py-2 rounded-lg border border-slate-700 font-semibold transition"
                >
                    Sair
                </button>
            </div>
        </nav>
    );
}