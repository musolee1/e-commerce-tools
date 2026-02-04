'use client'

import { Download, Loader2, Trash2, RefreshCw } from 'lucide-react'
import { useState } from 'react'

interface Column {
    key: string
    label: string
    render?: (value: any, row: any) => React.ReactNode
}

interface ProductTableProps {
    title: string
    data: any[]
    columns: Column[]
    loading: boolean
    onFetch: () => void
    onExport?: () => void
    onClear?: () => void
    fetchButtonText: string
    icon: React.ReactNode
}

export default function ProductTable({
    title,
    data,
    columns,
    loading,
    onFetch,
    onExport,
    onClear,
    fetchButtonText,
    icon,
}: ProductTableProps) {
    const [showClearConfirm, setShowClearConfirm] = useState(false)

    const handleClear = () => {
        if (onClear) {
            onClear()
            setShowClearConfirm(false)
        }
    }

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-6 flex flex-col">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6">
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2 sm:gap-3">
                    {icon}
                    <span className="truncate">{title}</span>
                    {data.length > 0 && (
                        <span className="text-xs sm:text-sm font-normal text-slate-500">
                            ({data.length})
                        </span>
                    )}
                </h2>
                <div className="flex items-center gap-2 flex-wrap">
                    {onClear && data.length > 0 && (
                        showClearConfirm ? (
                            <div className="flex items-center gap-2">
                                <span className="text-xs sm:text-sm text-slate-600">Emin misiniz?</span>
                                <button
                                    onClick={handleClear}
                                    className="flex items-center gap-1 px-2 sm:px-3 py-1.5 sm:py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-xs sm:text-sm font-medium"
                                >
                                    Evet
                                </button>
                                <button
                                    onClick={() => setShowClearConfirm(false)}
                                    className="flex items-center gap-1 px-2 sm:px-3 py-1.5 sm:py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors text-xs sm:text-sm font-medium"
                                >
                                    İptal
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={() => setShowClearConfirm(true)}
                                className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors text-xs sm:text-sm font-medium"
                            >
                                <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                                <span className="hidden sm:inline">Temizle</span>
                            </button>
                        )
                    )}
                    {onExport && data.length > 0 && (
                        <button
                            onClick={onExport}
                            className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors text-xs sm:text-sm font-medium"
                        >
                            <Download className="w-3 h-3 sm:w-4 sm:h-4" />
                            <span className="hidden sm:inline">Excel</span>
                        </button>
                    )}
                    <button
                        onClick={onFetch}
                        disabled={loading}
                        className="flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm font-medium"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" />
                                <span className="hidden sm:inline">Yükleniyor...</span>
                            </>
                        ) : (
                            <>
                                <RefreshCw className="w-3 h-3 sm:w-4 sm:h-4" />
                                <span className="hidden xs:inline">{fetchButtonText}</span>
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Content */}
            {loading ? (
                <div className="flex items-center justify-center py-12 sm:py-20">
                    <Loader2 className="w-6 h-6 sm:w-8 sm:h-8 animate-spin text-violet-600" />
                </div>
            ) : data.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 sm:py-20 text-slate-500">
                    <p className="text-base sm:text-lg font-medium">Henüz ürün bulunmuyor</p>
                    <p className="text-xs sm:text-sm mt-2 text-center">Yukarıdaki butona tıklayarak ürünleri çekin</p>
                </div>
            ) : (
                <div className="overflow-auto max-h-[300px] sm:max-h-[400px] -mx-4 sm:mx-0 px-4 sm:px-0">
                    <table className="w-full text-xs sm:text-sm">
                        <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 z-10">
                            <tr>
                                {columns.map((col) => (
                                    <th
                                        key={col.key}
                                        className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider whitespace-nowrap"
                                    >
                                        {col.label}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {data.map((row, idx) => (
                                <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                    {columns.map((col) => (
                                        <td key={col.key} className="px-2 sm:px-4 py-2 sm:py-3 text-slate-700 whitespace-nowrap">
                                            {col.render ? col.render(row[col.key], row) : row[col.key]}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}
