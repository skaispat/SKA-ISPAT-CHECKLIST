import React, { useState, useEffect } from 'react'
import { X, Play, Users, User, Video, ScrollText } from 'lucide-react'
import AdminLayout from "../components/layout/AdminLayout";

const HelpVideo = () => {
    const [userRole, setUserRole] = useState("")
    const [username, setUsername] = useState("")
    const [isVideoPlaying, setIsVideoPlaying] = useState(false)

    // Get user info from sessionStorage
    useEffect(() => {
        const storedRole = sessionStorage.getItem('role') || 'user'
        const storedUsername = sessionStorage.getItem('username') || 'User'
        setUserRole(storedRole)
        setUsername(storedUsername)
    }, [])

    // Function to convert YouTube URL to embed URL
    const getYouTubeEmbedUrl = (url) => {
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
        const match = url.match(regExp);
        return match && match[2].length === 11
            ? `https://www.youtube.com/embed/${match[2]}?autoplay=1&rel=0`
            : url;
    };

    // Different video URLs for admin and user
    const videoUrls = {
        admin: "https://youtu.be/v2yqJc1CKBA?si=J_r0PAIlGOqkHsz3", // Admin video
        user: "https://youtu.be/UL-EZE3c_pA"   // User video
    };

    const currentVideoUrl = videoUrls[userRole] || videoUrls.user;
    const embedUrl = getYouTubeEmbedUrl(currentVideoUrl);

    const handleVideoToggle = () => {
        setIsVideoPlaying(!isVideoPlaying)
    }

    return (
        <AdminLayout>
            <div className="min-h-screen bg-muted/30 p-6 sm:p-10">
                <div className="max-w-5xl mx-auto space-y-8">
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-4 self-start">
                            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                                <Video className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                                    Help Video
                                </h1>
                                <p className="text-muted-foreground mt-1">
                                    Video tutorial and guidance for using the system
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 bg-card border border-border rounded-full px-5 py-2.5 shadow-sm">
                            <div className={`p-1.5 rounded-full ${userRole === "admin" ? "bg-primary/10" : "bg-green-500/10"}`}>
                                {userRole === "admin" ? (
                                    <Users className="h-4 w-4 text-primary" />
                                ) : (
                                    <User className="h-4 w-4 text-green-600" />
                                )}
                            </div>
                            <span className="text-sm font-medium text-foreground">
                                {username} <span className="text-muted-foreground">({userRole === "admin" ? "Admin" : "User"})</span>
                            </span>
                        </div>
                    </div>

                    {/* Main Content */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Video Section */}
                        <div className="lg:col-span-2 space-y-4">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="h-2 w-2 rounded-full bg-primary animate-pulse"></div>
                                <h2 className="text-lg font-semibold text-foreground">
                                    {userRole === "admin" ? "Admin Dashboard Walkthrough" : "User Dashboard Walkthrough"}
                                </h2>
                            </div>

                            <div className="relative group bg-black rounded-2xl overflow-hidden shadow-lg border border-border/50 aspect-video">
                                {!isVideoPlaying ? (
                                    <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/50 group-hover:bg-zinc-900/40 transition-colors duration-300">
                                        <div className="text-center">
                                            <button
                                                onClick={handleVideoToggle}
                                                className="bg-primary hover:bg-primary/90 text-white rounded-full p-6 transition-all duration-300 transform group-hover:scale-110 shadow-xl"
                                            >
                                                <Play className="h-8 w-8 ml-1" />
                                            </button>
                                            <p className="text-white/80 mt-4 text-sm font-medium tracking-wide">Click to start tutorial</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="relative h-full w-full">
                                        <iframe
                                            width="100%"
                                            height="100%"
                                            src={embedUrl}
                                            title="YouTube video player"
                                            frameBorder="0"
                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                            allowFullScreen
                                            className="h-full w-full"
                                        ></iframe>
                                        <button
                                            onClick={handleVideoToggle}
                                            className="absolute top-4 right-4 bg-black/60 hover:bg-black/80 text-white rounded-full p-2 transition-colors backdrop-blur-sm"
                                        >
                                            <X className="h-4 w-4" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Description / Learning Points */}
                        <div className="lg:col-span-1">
                            <div className="bg-card border border-border rounded-xl p-6 h-full shadow-sm">
                                <h3 className="font-semibold text-foreground mb-6 flex items-center gap-2">
                                    <ScrollText className="h-5 w-5 text-primary" />
                                    What you'll learn
                                </h3>

                                <ul className="space-y-4">
                                    {userRole === "admin" ? (
                                        <>
                                            {[
                                                "Managing user accounts and permissions",
                                                "Creating and assigning tasks to team",
                                                "Monitoring system performance",
                                                "Generating reports and insights",
                                                "System configuration"
                                            ].map((text, i) => (
                                                <li key={i} className="flex items-start gap-3 text-sm text-muted-foreground">
                                                    <span className="flex-shrink-0 mt-1 h-1.5 w-1.5 rounded-full bg-primary/70" />
                                                    <span>{text}</span>
                                                </li>
                                            ))}
                                        </>
                                    ) : (
                                        <>
                                            {[
                                                "Navigating the main dashboard",
                                                "Completing tasks efficiently",
                                                "Using the checklist system",
                                                "Updating task status",
                                                "Delegation tools usage"
                                            ].map((text, i) => (
                                                <li key={i} className="flex items-start gap-3 text-sm text-muted-foreground">
                                                    <span className="flex-shrink-0 mt-1 h-1.5 w-1.5 rounded-full bg-green-500" />
                                                    <span>{text}</span>
                                                </li>
                                            ))}
                                        </>
                                    )}
                                </ul>

                                <div className="mt-8 p-4 rounded-lg bg-secondary/50 border border-border/50">
                                    <div className="flex gap-3">
                                        <Users className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                                        <div>
                                            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">
                                                Need more help?
                                            </p>
                                            <p className="text-sm text-foreground">
                                                Contact support for additional assistance with using these features.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AdminLayout>
    )
}

export default HelpVideo