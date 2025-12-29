import React, { useState, useEffect } from 'react'
import { KeyRound } from 'lucide-react'
import AdminLayout from "../components/layout/AdminLayout";

const License = () => {
    const [userRole, setUserRole] = useState("")
    const [username, setUsername] = useState("")

    // Get user info from sessionStorage
    useEffect(() => {
        const storedRole = sessionStorage.getItem('role') || 'user'
        const storedUsername = sessionStorage.getItem('username') || 'User'
        setUserRole(storedRole)
        setUsername(storedUsername)
    }, [])

    return (
        <AdminLayout>
            <div className="min-h-screen bg-muted/30 p-6 sm:p-10">
                <div className="max-w-4xl mx-auto space-y-8">
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                                <KeyRound className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                                    License Agreement
                                </h1>
                                <p className="text-muted-foreground mt-1">
                                    Software license terms and conditions
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* License Content */}
                    <div className="bg-card text-card-foreground rounded-xl border border-border shadow-sm overflow-hidden">
                        <div className="p-8 space-y-8">
                            {/* Copyright Notice */}
                            <div className="relative overflow-hidden rounded-xl bg-secondary/50 p-8 border border-border/50">
                                <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-primary/5 blur-2xl"></div>
                                <div className="absolute bottom-0 left-0 -mb-4 -ml-4 h-24 w-24 rounded-full bg-primary/5 blur-2xl"></div>

                                <div className="relative text-center space-y-4">
                                    <div className="text-lg font-semibold tracking-wide text-primary">
                                        © BOTIVATE SERVICES LLP
                                    </div>
                                    <p className="text-muted-foreground leading-relaxed max-w-2xl mx-auto">
                                        This software is developed exclusively by Botivate Services LLP for use by its clients.
                                        Unauthorized use, distribution, or copying of this software is strictly prohibited and
                                        may result in legal action.
                                    </p>
                                </div>
                            </div>

                            {/* Divider */}
                            <div className="h-px bg-border w-full"></div>

                            {/* Contact Information */}
                            <div className="flex flex-col items-center justify-center space-y-6">
                                <div className="text-center space-y-2">
                                    <h4 className="font-semibold text-foreground">Contact Support</h4>
                                    <p className="text-sm text-muted-foreground">
                                        For license inquiries or technical support, please contact our team
                                    </p>
                                </div>

                                <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
                                    <a
                                        href="mailto:info@botivate.in"
                                        className="flex items-center justify-center gap-3 px-6 py-3 rounded-lg bg-secondary hover:bg-secondary/80 text-secondary-foreground transition-colors border border-border/50 group"
                                    >
                                        <span className="text-xl group-hover:scale-110 transition-transform duration-200">📧</span>
                                        <span className="font-medium">info@botivate.in</span>
                                    </a>
                                    <a
                                        href="https://www.botivate.in"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center justify-center gap-3 px-6 py-3 rounded-lg bg-secondary hover:bg-secondary/80 text-secondary-foreground transition-colors border border-border/50 group"
                                    >
                                        <span className="text-xl group-hover:scale-110 transition-transform duration-200">🌐</span>
                                        <span className="font-medium">www.botivate.in</span>
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AdminLayout>
    )
}

export default License