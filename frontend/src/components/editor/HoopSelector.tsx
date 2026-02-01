"use client";

import { useEditorStore } from '@/store/editorStore';
import { HOOP_PRESETS } from '@/constants/hoops';
import { Frame } from 'lucide-react';

export default function HoopSelector() {
    const { selectedHoopId, selectHoop } = useEditorStore();

    return (
        <div className="flex items-center gap-2 px-4 py-2 bg-white border-b border-gray-100">
            <Frame size={16} className="text-gray-500" />
            <select
                value={selectedHoopId}
                onChange={(e) => selectHoop(e.target.value)}
                className="text-xs border-none focus:ring-0 cursor-pointer bg-transparent font-medium text-gray-700 hover:text-black"
                title="Select Machine Hoop"
            >
                {HOOP_PRESETS.map(hoop => (
                    <option key={hoop.id} value={hoop.id}>
                        {hoop.name} ({hoop.width}x{hoop.height}mm)
                    </option>
                ))}
            </select>

            <span className="text-[10px] text-gray-400 border-l pl-2 ml-2">
                Máquina Lista
            </span>
        </div>
    );
}
