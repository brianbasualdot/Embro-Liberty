"use client";

import { useState } from 'react';
import Link from 'next/link';
import { Plus, Search, Filter, MoreHorizontal, LayoutGrid, List as ListIcon } from 'lucide-react';
import { HOOP_PRESETS } from '@/constants/hoops';

// Mock Project Data
const MOCK_PROJECTS = [
    { id: 1, name: 'Floral Pattern v2', date: '2 hrs ago', format: 'PES', hoop: 'singer-l', image: 'https://placehold.co/300x200/png?text=Floral' },
    { id: 2, name: 'Company Logo', date: '1 day ago', format: 'DST', hoop: 'singer-s', image: 'https://placehold.co/300x200/png?text=Logo' },
    { id: 3, name: 'Typography Test', date: '3 days ago', format: 'XXX', hoop: 'brother-4x4', image: 'https://placehold.co/300x200/png?text=Type' },
    { id: 4, name: 'Patch Design', date: '1 week ago', format: 'DST', hoop: 'singer-m', image: 'https://placehold.co/300x200/png?text=Patch' },
];

export default function DashboardPage() {
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [filterHoop, setFilterHoop] = useState<string>('all');

    // Filter Logic
    const filteredProjects = MOCK_PROJECTS.filter(p =>
        filterHoop === 'all' || p.hoop === filterHoop
    );

    return (
        <div className="min-h-screen bg-[#F7F7F5] text-gray-900 font-sans">

            {/* Sidebar Navigation */}
            <aside className="fixed left-0 top-0 h-full w-64 bg-white border-r border-gray-200 p-6 flex flex-col">
                <div className="flex items-center gap-2 mb-8">
                    <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center text-white font-bold">E</div>
                    <span className="font-semibold text-lg tracking-tight">Embro Liberty</span>
                </div>

                <nav className="space-y-1 flex-1">
                    <a href="#" className="flex items-center gap-3 px-3 py-2 bg-gray-100 rounded-md text-sm font-medium">
                        <LayoutGrid size={18} /> All Projects
                    </a>
                    <a href="#" className="flex items-center gap-3 px-3 py-2 text-gray-500 hover:bg-gray-50 rounded-md text-sm font-medium transition-colors">
                        <StarIcon /> Favorites
                    </a>
                    <a href="#" className="flex items-center gap-3 px-3 py-2 text-gray-500 hover:bg-gray-50 rounded-md text-sm font-medium transition-colors">
                        <ArchiveIcon /> Archived
                    </a>
                </nav>

                <div className="pt-6 border-t border-gray-100">
                    <p className="text-xs font-semibold text-gray-400 mb-4 uppercase tracking-wider">Storage</p>
                    <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden mb-2">
                        <div className="bg-green-500 h-full w-[45%]"></div>
                    </div>
                    <p className="text-xs text-gray-500">450MB of 1GB used</p>
                </div>
            </aside>

            {/* Main Content */}
            <main className="ml-64 p-8">

                {/* Header */}
                <header className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-2xl font-semibold mb-1">Projects</h1>
                        <p className="text-gray-500 text-sm">Manage your embroidery designs.</p>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search..."
                                className="pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-100 w-64"
                            />
                        </div>
                        <Link href="/" className="flex items-center gap-2 px-4 py-2 bg-black text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors shadow-sm">
                            <Plus size={16} /> New Project
                        </Link>
                    </div>
                </header>

                {/* Toolbar */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                        <button className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-md text-sm font-medium hover:bg-gray-50 transition-colors">
                            <Filter size={14} /> Filter
                        </button>
                        <select
                            value={filterHoop}
                            onChange={(e) => setFilterHoop(e.target.value)}
                            className="px-3 py-1.5 bg-white border border-gray-200 rounded-md text-sm font-medium focus:outline-none"
                        >
                            <option value="all">All Hoops</option>
                            {HOOP_PRESETS.map(h => (
                                <option key={h.id} value={h.id}>{h.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex bg-gray-100 p-1 rounded-md">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-white shadow-sm' : 'text-gray-500'}`}
                        >
                            <LayoutGrid size={16} />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-1.5 rounded ${viewMode === 'list' ? 'bg-white shadow-sm' : 'text-gray-500'}`}
                        >
                            <ListIcon size={16} />
                        </button>
                    </div>
                </div>

                {/* Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredProjects.map(project => (
                        <div key={project.id} className="group bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-all cursor-pointer">
                            <div className="h-40 bg-gray-50 relative border-b border-gray-100 flex items-center justify-center">
                                {/* Thumbnail Placeholder */}
                                <img src={project.image} alt={project.name} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />

                                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button className="p-1 bg-white rounded-md shadow-sm hover:bg-gray-50">
                                        <MoreHorizontal size={16} />
                                    </button>
                                </div>
                            </div>
                            <div className="p-4">
                                <h3 className="font-semibold text-gray-900 mb-1">{project.name}</h3>
                                <div className="flex items-center justify-between text-xs text-gray-500">
                                    <span>{project.date}</span>
                                    <div className="flex items-center gap-2">
                                        <span className="px-2 py-0.5 bg-gray-100 rounded text-gray-600 font-medium">{project.format}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

            </main>
        </div>
    );
}

function StarIcon() {
    return <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
}
function ArchiveIcon() {
    return <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="5" x="2" y="3" rx="1" /><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8" /><path d="M10 12h4" /></svg>
}
