"use client";

import Sidebar from '@/components/layout/Sidebar';
import EditorCanvas from '@/components/editor/EditorCanvas';
import { Upload } from 'lucide-react';
import { useState } from 'react';
import { useEditorStore } from '@/store/editorStore';

export default function Home() {
  const { setLayers } = useEditorStore();
  const [isUploading, setIsUploading] = useState(false);

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
      <Sidebar />
      <div className="relative flex-1 flex flex-col">
        {/* Top Bar / Toolbar placeholder */}
        import HoopSelector from '@/components/editor/HoopSelector';

        // ... inside component ...
        <div className="h-14 border-b border-[#e5e5e5] bg-white flex items-center px-4 justify-between">
          <div className="flex items-center gap-4">
            <h1 className="font-medium text-sm">Untitled Design</h1>
            <div className="h-4 w-px bg-gray-200"></div>
            <HoopSelector />
          </div>

          <label className="flex items-center gap-2 px-3 py-1.5 bg-black text-white text-xs rounded hover:bg-gray-800 cursor-pointer transition-colors">
            <Upload size={14} />
            {isUploading ? "Processing..." : "Import Image"}
            <input type="file" className="hidden" accept="image/*" onChange={handleUpload} disabled={isUploading} />
          </label>
        </div>

        <EditorCanvas />
      </div>
    </main>
  );
}
