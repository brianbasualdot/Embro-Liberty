"use client";

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Eye, EyeOff, Lock, Unlock, GripVertical, Play } from 'lucide-react';
import { Layer } from '@/types/embroidery';
import clsx from 'clsx';

interface LayerItemProps {
    layer: Layer;
    isSelected: boolean;
    onSelect: (id: string) => void;
    onToggleVisibility: (id: string) => void;
    onToggleLock: (id: string) => void;
    onPlay: (id: string) => void;
}

export function LayerItem({ layer, isSelected, onSelect, onToggleVisibility, onToggleLock, onPlay }: LayerItemProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: layer.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 10 : 'auto', // Keep dragged item on top
        position: 'relative' as const,
    };

    return (
        <li
            ref={setNodeRef}
            style={style}
            className={clsx(
                "group flex items-center justify-between p-2 rounded-md mb-1 text-sm border border-transparent hover:border-gray-200 transition-all select-none",
                isSelected ? "bg-white shadow-sm border-gray-200" : "hover:bg-[#eaeaeb]",
                isDragging && "opacity-50"
            )}
            onClick={() => onSelect(layer.id)}
        >
            <div className="flex items-center gap-3 flex-1 overflow-hidden">
                {/* Drag Handle */}
                <div {...attributes} {...listeners} className="cursor-grab opacity-0 group-hover:opacity-40 hover:!opacity-100">
                    <GripVertical size={14} />
                </div>

                {/* Color Indicator */}
                <div
                    className="w-3 h-3 rounded-full border border-black/10 shrink-0"
                    style={{ backgroundColor: layer.color }}
                />

                {/* Name & Stats */}
                <div className="flex flex-col truncate">
                    <span className={clsx("font-medium truncate", isSelected ? "text-gray-900" : "text-gray-600")}>
                        {layer.name}
                    </span>
                    <span className="text-[10px] text-gray-400">
                        {layer.stitchCount ? `~${layer.stitchCount} sts` : 'Calculating...'}
                    </span>
                </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                    onClick={(e) => { e.stopPropagation(); onPlay(layer.id); }}
                    className="p-1 text-gray-400 hover:text-blue-500 rounded hover:bg-gray-100"
                    title="Simulate"
                >
                    <Play size={12} />
                </button>
                <button
                    onClick={(e) => { e.stopPropagation(); onToggleLock(layer.id); }}
                    className="p-1 text-gray-400 hover:text-gray-700 rounded hover:bg-gray-100"
                >
                    {layer.locked ? <Lock size={12} /> : <Unlock size={12} />}
                </button>
                <button
                    onClick={(e) => { e.stopPropagation(); onToggleVisibility(layer.id); }}
                    className="p-1 text-gray-400 hover:text-gray-700 rounded hover:bg-gray-100"
                >
                    {layer.visible ? <Eye size={12} /> : <EyeOff size={12} />}
                </button>
            </div>
        </li>
    );
}
