"use client";

import { useState } from 'react';
import LayerList from '@/components/layers/LayerList';
import FabricSettings from '@/components/editor/FabricSettings';
import { Layers, Settings, Palette } from 'lucide-react';
import clsx from 'clsx';
import { useEditorStore } from '@/store/editorStore';

export default function Sidebar() {
    const [activeTab, setActiveTab] = useState<'layers' | 'settings'>('layers');
    const { layers } = useEditorStore();

    return (
        <div className="w-64 bg-white border-r border-[#e5e5e5] flex flex-col h-full z-20">
            {/* Sidebar Header / Tab Switcher */}
            <div className="flex border-b border-gray-100">
                <button
                    onClick={() => setActiveTab('layers')}
                    className={clsx(
                        "flex-1 py-3 text-xs font-medium flex items-center justify-center gap-2 border-b-2 transition-colors",
                        activeTab === 'layers'
                            ? "border-black text-black"
                            : "border-transparent text-gray-500 hover:text-gray-900"
                    )}
                >
                    <Layers size={14} />
                    Layers ({layers.length})
                </button>
                <button
                    onClick={() => setActiveTab('settings')}
                    className={clsx(
                        "flex-1 py-3 text-xs font-medium flex items-center justify-center gap-2 border-b-2 transition-colors",
                        activeTab === 'settings'
                            ? "border-black text-black"
                            : "border-transparent text-gray-500 hover:text-gray-900"
                    )}
                >
                    <Settings size={14} />
                    Properties
                </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-hidden relative">
                <div className={clsx("absolute inset-0 transition-opacity duration-200", activeTab === 'layers' ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none")}>
                    {/* Using key to force re-render if needed, but not necessary usually */}
                    <LayerList />
                </div>

                <div className={clsx("absolute inset-0 bg-white transition-opacity duration-200", activeTab === 'settings' ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none")}>
                    <FabricSettings />
                </div>
            </div>

            {/* Footer / Branding */}
            <div className="p-4 border-t border-gray-100 text-[10px] text-gray-400 text-center uppercase tracking-widest">
                Embro Liberty CAD
            </div>
        </div>
    );
}
