"use client";

import { useEditorStore } from '@/store/editorStore';
import { MousePointer2, PenTool, BoxSelect, Scissors, Circle, Square, Play } from 'lucide-react';
import clsx from 'clsx';
import { ToolType } from '@/types/embroidery';
import { useState } from 'react';
import StitchSimulatorOverlay from '@/components/simulation/StitchSimulator';

export default function Toolbar() {
    const { activeTool, setTool } = useEditorStore();
    const [showSim, setShowSim] = useState(false);

    const tools = [
        { id: 'select', icon: MousePointer2, label: 'Select (V)' },
        { id: 'node_edit', icon: BoxSelect, label: 'Node Edit (A)' },
        { id: 'pen', icon: PenTool, label: 'Pen Tool (P)' },
        { id: 'rectangle', icon: Square, label: 'Rectangle (M)' },
        { id: 'circle', icon: Circle, label: 'Circle (L)' },
        { id: 'knife', icon: Scissors, label: 'Knife (K)' },
    ] as const;

    return (
        <>
            <div className="h-full w-12 bg-white border-r border-[#e5e5e5] flex flex-col items-center py-4 gap-2 shadow-sm z-10">
                {tools.map((tool) => (
                    <button
                        key={tool.id}
                        onClick={() => setTool(tool.id as ToolType)}
                        className={clsx(
                            "p-2 rounded-md transition-all duration-200 group relative",
                            activeTool === tool.id
                                ? "bg-blue-50 text-blue-600 shadow-inner"
                                : "text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                        )}
                        title={tool.label}
                    >
                        <tool.icon size={20} />

                        {/* Tooltip */}
                        <span className="absolute left-14 top-1/2 -translate-y-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                            {tool.label}
                        </span>
                    </button>
                ))}

                <div className="flex-1"></div>

                {/* Simulation Trigger */}
                <button
                    onClick={() => setShowSim(true)}
                    className="p-2 mb-4 text-green-600 hover:bg-green-50 rounded-md transition-all group relative"
                    title="Simulate"
                >
                    <Play size={20} />
                    <span className="absolute left-14 top-1/2 -translate-y-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                        Simulate
                    </span>
                </button>
            </div>

            {showSim && <StitchSimulatorOverlay onClose={() => setShowSim(false)} />}
        </>
    );
}
