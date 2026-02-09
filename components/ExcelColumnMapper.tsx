'use client'

import React from 'react'
import { X } from 'lucide-react'

export type MappingFieldType = 'urunGrupId' | 'isim' | 'varyantDeger1' | 'resimUrl' | 'stok' | 'sku' | 'ignore'

export interface ExcelColumn {
    name: string
    sampleValue: string
}

export interface ColumnMapping {
    urunGrupId: string
    isim: string
    varyantDeger1?: string
    resimUrl?: string
    stok: string
    sku?: string
}

export const FIELD_OPTIONS: { value: MappingFieldType; label: string; required?: boolean }[] = [
    { value: 'urunGrupId', label: 'Ürün Grup ID', required: true },
    { value: 'isim', label: 'İsim', required: true },
    { value: 'stok', label: 'Stok', required: true },
    { value: 'varyantDeger1', label: 'Varyant Değer 1' },
    { value: 'resimUrl', label: 'Resim URL' },
    { value: 'sku', label: 'SKU' },
]

interface ExcelColumnMapperProps {
    isOpen: boolean
    onClose: () => void
    onSave: (mapping: Record<string, MappingFieldType>) => void
    previewColumns: ExcelColumn[]
    totalRows: number
    initialMapping?: Record<string, MappingFieldType>
}

export default function ExcelColumnMapper({
    isOpen,
    onClose,
    onSave,
    previewColumns,
    totalRows,
    initialMapping = {}
}: ExcelColumnMapperProps) {
    const [columnMappings, setColumnMappings] = React.useState<Record<string, MappingFieldType>>(initialMapping)
    const [error, setError] = React.useState<string | null>(null)

    React.useEffect(() => {
        setColumnMappings(initialMapping)
    }, [initialMapping])

    const handleMappingChange = (columnName: string, fieldType: MappingFieldType) => {
        setColumnMappings(prev => ({
            ...prev,
            [columnName]: fieldType
        }))
        setError(null)
    }

    const handleSave = () => {
        // Validate required fields are mapped
        const requiredFields = ['urunGrupId', 'isim', 'stok'] as const
        const mappedFieldValues = Object.values(columnMappings).filter(v => v !== 'ignore')

        const missingFields = requiredFields.filter(field => !mappedFieldValues.includes(field))
        if (missingFields.length > 0) {
            const fieldLabels = missingFields.map(f => FIELD_OPTIONS.find(o => o.value === f)?.label).join(', ')
            setError(`Lütfen zorunlu alanları eşleştirin: ${fieldLabels}`)
            return
        }

        // Check for duplicate mappings (except 'ignore')
        const duplicates = mappedFieldValues.filter((v, i) => mappedFieldValues.indexOf(v) !== i)
        if (duplicates.length > 0) {
            setError('Bir alan birden fazla kolona atanamaz')
            return
        }

        onSave(columnMappings)
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                {/* Modal Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-200">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900">Excel Kolon Eşleştirmesi</h2>
                        <p className="text-sm text-slate-500 mt-1">
                            {totalRows} satır bulundu. Her kolon için karşılık gelen alanı seçin.
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5 text-slate-500" />
                    </button>
                </div>

                {/* Modal Body */}
                <div className="flex-1 overflow-x-auto overflow-y-hidden p-6">
                    <div className="flex gap-4 pb-4 min-w-max">
                        {previewColumns.map((column, index) => (
                            <div
                                key={index}
                                className="w-64 flex flex-col gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-sm"
                            >
                                {/* 1. Field Selection (Top) */}
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">
                                        Eşleşen Alan
                                    </label>
                                    <select
                                        value={columnMappings[column.name] || ''}
                                        onChange={(e) => handleMappingChange(column.name, e.target.value as MappingFieldType)}
                                        className={`w-full px-3 py-2 border rounded-lg text-sm font-medium focus:outline-none focus:ring-2 transition-all ${columnMappings[column.name] && columnMappings[column.name] !== 'ignore'
                                                ? 'border-emerald-200 bg-emerald-50 text-emerald-700 focus:ring-emerald-500'
                                                : 'border-slate-200 bg-white text-slate-700 focus:ring-indigo-500'
                                            }`}
                                    >
                                        <option value="">Seçiniz...</option>
                                        <option value="ignore">-- Kullanma --</option>
                                        {FIELD_OPTIONS.map(option => {
                                            // Check if this option is selected in another column
                                            const isSelectedElsewhere = Object.entries(columnMappings).some(
                                                ([colName, selectedField]) =>
                                                    colName !== column.name && selectedField === option.value
                                            )

                                            // Don't show option if it's selected elsewhere
                                            if (isSelectedElsewhere) return null

                                            return (
                                                <option key={option.value} value={option.value}>
                                                    {option.label}{option.required ? ' *' : ''}
                                                </option>
                                            )
                                        })}
                                    </select>
                                </div>

                                {/* Divider */}
                                <div className="h-px bg-slate-200 w-full"></div>

                                {/* 2. Excel Column Info */}
                                <div className="flex-1">
                                    <div className="text-xs font-semibold text-slate-400 mb-1">EXCEL KOLONU</div>
                                    <div className="font-bold text-slate-800 text-sm mb-2 break-words" title={column.name}>
                                        {column.name}
                                    </div>

                                    <div className="text-xs font-semibold text-slate-400 mb-1">ÖRNEK DEĞER</div>
                                    <div className="text-sm text-slate-600 bg-white border border-slate-200 rounded p-2 min-h-[2.5rem] break-words text-wrap max-h-24 overflow-y-auto">
                                        {column.sampleValue || <span className="text-slate-400 italic">(boş)</span>}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm font-medium">
                            {error}
                        </div>
                    )}

                    {/* Required Fields Note */}
                    <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
                        <div className="p-2 bg-amber-100 rounded-lg text-amber-600">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <div>
                            <h4 className="text-sm font-bold text-amber-900">Dikkat Edilmesi Gerekenler</h4>
                            <p className="text-sm text-amber-800 mt-1">
                                Kaydetme işlemini tamamlamak için aşağıdaki zorunlu alanları mutlaka eşleştirmelisiniz:
                                <span className="font-bold ml-1">Ürün Grup ID, İsim, Stok</span>
                            </p>
                        </div>
                    </div>
                </div>

                {/* Modal Footer */}
                <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-200 bg-slate-50">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-slate-600 hover:text-slate-800 font-medium transition-colors"
                    >
                        İptal
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-6 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold rounded-lg transition-all shadow-lg shadow-emerald-500/30"
                    >
                        Kaydet
                    </button>
                </div>
            </div>
        </div>
    )
}
