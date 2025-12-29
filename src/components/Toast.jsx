import { useEffect } from 'react'
import { CheckCircle2, AlertCircle, X } from 'lucide-react'

export default function Toast({ message, type, onClose }) {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose()
        }, 3000)
        return () => clearTimeout(timer)
    }, [onClose])

    if (!message) return null

    return (
        <div className={`fixed top-5 right-5 z-[70] flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border animate-in slide-in-from-right-5 fade-in duration-300 ${type === 'success'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                : 'bg-red-50 text-red-700 border-red-100'
            }`}>
            {type === 'success' ? <CheckCircle2 size={20} className="shrink-0" /> : <AlertCircle size={20} className="shrink-0" />}
            <p className="text-sm font-medium mr-2">{message}</p>
            <button
                onClick={onClose}
                className={`p-1 rounded-full transition-colors shrink-0 ${type === 'success' ? 'hover:bg-emerald-100' : 'hover:bg-red-100'
                    }`}
            >
                <X size={16} />
            </button>
        </div>
    )
}
