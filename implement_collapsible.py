import re

with open('app/dashboard/instagram/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Find the imageUrls.map section and replace with collapsible version
old_pattern = r'<div className="space-y-3">\s*\{imageUrls\.map\(\(url, index\) => \([\s\S]*?\)\)\}\s*</div>'

new_code = '''<div className="space-y-3">
                                {/* First URL - Always Visible */}
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                        <input
                                            type="url"
                                            value={imageUrls[0] || ''}
                                            onChange={(e) => updateImageUrl(0, e.target.value)}
                                            placeholder="Görsel 1 URL"
                                            className="w-full pl-11 pr-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm"
                                        />
                                    </div>
                                </div>

                                {/* Additional URLs - Collapsible */}
                                {imageUrls.length > 1 && (
                                    <>
                                        {(urlsExpanded || imageUrls.length === 2) && imageUrls.slice(1).map((url, idx) => (
                                            <div key={idx + 1} className="flex gap-2">
                                                <div className="relative flex-1">
                                                    <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                                    <input
                                                        type="url"
                                                        value={url}
                                                        onChange={(e) => updateImageUrl(idx + 1, e.target.value)}
                                                        placeholder={`Görsel ${idx + 2} URL`}
                                                        className="w-full pl-11 pr-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm"
                                                    />
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => removeImageUrl(idx + 1)}
                                                    className="p-2.5 text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                                                >
                                                    <X className="w-5 h-5" />
                                                </button>
                                            </div>
                                        ))}

                                        {imageUrls.length > 2 && (
                                            <button
                                                type="button"
                                                onClick={() => setUrlsExpanded(!urlsExpanded)}
                                                className="flex items-center gap-2 text-sm text-violet-600 hover:text-violet-700 font-medium"
                                            >
                                                {urlsExpanded ? (
                                                    <>
                                                        <ChevronUp className="w-4 h-4" />
                                                        Gizle
                                                    </>
                                                ) : (
                                                    <>
                                                        <ChevronDown className="w-4 h-4" />
                                                        {imageUrls.length - 1} görseli göster
                                                    </>
                                                )}
                                            </button>
                                        )}
                                    </>
                                )}
                            </div>'''

content = re.sub(old_pattern, new_code, content)

with open('app/dashboard/instagram/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Collapsible URLs implemented!")
