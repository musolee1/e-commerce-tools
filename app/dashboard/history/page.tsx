'use client'

import { useState, useEffect } from 'react'
import { History as HistoryIcon, Loader2, CheckCircle2, XCircle, Package } from 'lucide-react'
import { TelegramLog } from '@/lib/types'

export default function HistoryPage() {
    const [loading, setLoading] = useState(true)
    const [logs, setLogs] = useState<TelegramLog[]>([])
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        loadLogs()
    }, [])

    const loadLogs = async () => {
        try {
            const response = await fetch('/api/telegram-logs')
            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Loglar yüklenemedi')
            }

            setLogs(data.logs)
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const formatDate = (dateString: string) => {
        const date = new Date(dateString)
        return new Intl.DateTimeFormat('tr-TR', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        }).format(date)
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
            </div>
        )
    }

    return (
        <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-900 mb-2 flex items-center gap-3">
                    <div className="w-10 h-10 bg-violet-100 rounded-lg flex items-center justify-center">
                        <HistoryIcon className="w-5 h-5 text-violet-600" />
                    </div>
                    Gönderim Geçmişi
                </h1>
                <p className="text-slate-600">
                    Telegram'a gönderilen ürünlerin geçmişini buradan görüntüleyin
                </p>
            </div>

            {/* Error */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
                    <p className="text-sm text-red-700">{error}</p>
                </div>
            )}

            {/* Stats Cards */}
            {!error && logs.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-white rounded-xl border border-slate-200 p-6">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                                <Package className="w-6 h-6 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-slate-900">{logs.length}</p>
                                <p className="text-sm text-slate-600">Toplam Gönderim</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl border border-slate-200 p-6">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                                <CheckCircle2 className="w-6 h-6 text-green-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-slate-900">
                                    {logs.filter((l) => l.status === 'success').length}
                                </p>
                                <p className="text-sm text-slate-600">Başarılı</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl border border-slate-200 p-6">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                                <XCircle className="w-6 h-6 text-red-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-slate-900">
                                    {logs.filter((l) => l.status === 'failed').length}
                                </p>
                                <p className="text-sm text-slate-600">Başarısız</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Logs Table */}
            {logs.length > 0 ? (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="text-left py-4 px-6 text-sm font-semibold text-slate-700">
                                        Ürün Adı
                                    </th>
                                    <th className="text-center py-4 px-6 text-sm font-semibold text-slate-700">
                                        Stok
                                    </th>
                                    <th className="text-center py-4 px-6 text-sm font-semibold text-slate-700">
                                        Durum
                                    </th>
                                    <th className="text-left py-4 px-6 text-sm font-semibold text-slate-700">
                                        Gönderim Tarihi
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {logs.map((log) => (
                                    <tr
                                        key={log.id}
                                        className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                                    >
                                        <td className="py-4 px-6">
                                            <div>
                                                <p className="text-sm font-medium text-slate-900">{log.product_name}</p>
                                                <p className="text-xs text-slate-500 font-mono mt-1 truncate max-w-xs">
                                                    {log.product_slug}
                                                </p>
                                            </div>
                                        </td>
                                        <td className="py-4 px-6 text-center">
                                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                                                {log.stock_count}
                                            </span>
                                        </td>
                                        <td className="py-4 px-6 text-center">
                                            {log.status === 'success' ? (
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                                    Başarılı
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                                                    <XCircle className="w-3.5 h-3.5" />
                                                    Başarısız
                                                </span>
                                            )}
                                        </td>
                                        <td className="py-4 px-6 text-sm text-slate-600">{formatDate(log.sent_at)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <HistoryIcon className="w-8 h-8 text-slate-400" />
                    </div>
                    <h3 className="text-lg font-medium text-slate-900 mb-2">
                        Henüz gönderim yapılmadı
                    </h3>
                    <p className="text-sm text-slate-500">
                        Telegram'a ürün göndermeye başladığınızda geçmiş burada görünecek
                    </p>
                </div>
            )}
        </div>
    )
}
