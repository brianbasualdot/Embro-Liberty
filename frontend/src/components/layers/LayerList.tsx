"use client";

import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useEditorStore } from '@/store/editorStore';
import { LayerItem } from './LayerItem';
import { Layers } from 'lucide-react';

export default function LayerList() {
    const { layers, selectedLayerId, selectLayer, toggleLayerVisibility, toggleLayerLock, reorderLayers } = useEditorStore();

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (active.id !== over?.id) {
            const oldIndex = layers.findIndex((layer) => layer.id === active.id);
            const newIndex = layers.findIndex((layer) => layer.id === over?.id);
            reorderLayers(oldIndex, newIndex);
        }
    };

    const handlePlay = (id: string) => {
        console.log("Simulating layer:", id);
        // Will implement simulation logic later that interacts with Fabric canvas
        // Usually dispatched via an event or store action
    };

    return (
        <aside className="w-64 bg-[#f7f7f5] border-r border-[#e5e5e5] h-screen flex flex-col select-none">
            <div className="p-4 border-b border-[#e5e5e5] flex items-center gap-2">
                <Layers size={18} className="text-gray-600" />
                <span className="font-semibold text-sm text-gray-700">Layers</span>
            </div>

            <div className="flex-1 overflow-y-auto p-2">
                {layers.length === 0 && (
                    <div className="text-xs text-gray-400 text-center mt-10">
                        No layers loaded. Upload an image to begin.
                    </div>
                )}

                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                >
                    <SortableContext
                        items={layers.map(l => l.id)}
                        strategy={verticalListSortingStrategy}
                    >
                        <ul>
                            {layers.map((layer) => (
                                <LayerItem
                                    key={layer.id}
                                    layer={layer}
                                    isSelected={selectedLayerId === layer.id}
                                    onSelect={selectLayer}
                                    onToggleVisibility={toggleLayerVisibility}
                                    onToggleLock={toggleLayerLock}
                                    onPlay={handlePlay}
                                />
                            ))}
                        </ul>
                    </SortableContext>
                </DndContext>
            </div>
        </aside>
    );
}
