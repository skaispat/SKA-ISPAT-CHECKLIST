import React from 'react'
import AdminLayout from "../components/layout/AdminLayout"

const MillGatePass = () => {
    return (
        <AdminLayout>
            <div className="w-full h-[calc(100vh-100px)] bg-card rounded-xl border border-border shadow-sm overflow-hidden flex flex-col relative">
                {/* Iframe Container with clipping */}
                <div className="flex-1 w-full overflow-hidden relative">
                    <iframe
                        src="https://ska-millgatepass.vercel.app/history"
                        title="Mill Gate Pass System"
                        className="absolute inset-0 w-full h-[calc(100%+60px)] border-none"
                        allow="camera; microphone; geolocation"
                    />
                </div>
            </div>
        </AdminLayout>
    )
}

export default MillGatePass