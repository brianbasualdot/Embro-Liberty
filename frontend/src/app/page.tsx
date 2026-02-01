"use client";

import Sidebar from '@/components/layout/Sidebar';
import EditorCanvas from '@/components/editor/EditorCanvas';
import { Upload } from 'lucide-react';
import { useState } from 'react';
import { useEditorStore } from '@/store/editorStore';
import HoopSelector from '@/components/editor/HoopSelector';
import FabricSettings from '@/components/editor/FabricSettings';
import LayerList from '@/components/layers/LayerList';
import ErrorBoundary from '@/components/common/ErrorBoundary';

export default function Home() {
  const { setLayers } = useEditorStore();
  const [isUploading, setIsUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<'layers' | 'settings'>('layers');

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('k', '5'); // Default 5 colors

    try {
      const res = await fetch('http://localhost:8000/process-image', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();

      // Transform backend data to store layers
      const newLayers = data.layers.map((l: any, idx: number) => ({
        id: `layer-${idx}`,
        name: `Color ${l.color}`,
        color: l.color,
        visible: true,
        paths: l.paths
      }));

      setLayers(newLayers);

    } catch (error) {
      console.error("Upload failed", error);
      alert("Failed to process image");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <main className="flex h-screen w-full">
      <ErrorBoundary componentName="Sidebar">
        <Sidebar />
      </ErrorBoundary>
      <div className="relative flex-1 flex flex-col">
        {/* Top Bar / Toolbar */}
        <div className="h-14 border-b border-[#e5e5e5] bg-white flex items-center px-4 justify-between">
          <div className="flex items-center gap-4">
            <h1 className="font-medium text-sm">Untitled Design</h1>
            <div className="h-4 w-px bg-gray-200"></div>
            <ErrorBoundary componentName="HoopSelector">
              <HoopSelector />
            </ErrorBoundary>
          </div>

          <label className="flex items-center gap-2 px-3 py-1.5 bg-black text-white text-xs rounded hover:bg-gray-800 cursor-pointer transition-colors">
            <Upload size={14} />
            {isUploading ? "Processing..." : "Import Image"}
            <input type="file" className="hidden" accept="image/*" onChange={handleUpload} disabled={isUploading} />
          </label>
        </div>

        <div className="flex-1 flex overflow-hidden">
          <ErrorBoundary componentName="EditorCanvas">
            <EditorCanvas />
          </ErrorBoundary>

          {/* Right Sidebar for Layers & Settings */}
          <div className="w-80 bg-white border-l border-[#e5e5e5] flex flex-col overflow-hidden">
            {/* Tabs */}
            <div className="flex border-b border-[#e5e5e5]">
              <button
                onClick={() => setActiveTab('layers')}
                className={`flex-1 py-3 text-xs font-medium text-center transition-colors ${activeTab === 'layers' ? 'text-black border-b-2 border-black' : 'text-gray-500 hover:text-gray-800'}`}
              >
                Layers
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className={`flex-1 py-3 text-xs font-medium text-center transition-colors ${activeTab === 'settings' ? 'text-black border-b-2 border-black' : 'text-gray-500 hover:text-gray-800'}`}
              >
                Properties
              </button>
            </div>

            <div className="flex-1 overflow-y-auto bg-[#f9f9f9]">
              {activeTab === 'layers' ? (
                <ErrorBoundary componentName="LayerList">
                  <LayerList />
                </ErrorBoundary>
              ) : (
                <ErrorBoundary componentName="FabricSettings">
                  <FabricSettings />
                </ErrorBoundary>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
