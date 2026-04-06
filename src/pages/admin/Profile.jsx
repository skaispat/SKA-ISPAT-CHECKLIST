import { useState, useEffect } from "react"
import AdminLayout from "../../components/layout/AdminLayout"
import { supabase } from "../../supabase"
import { User, Lock, Save, Eye, EyeOff, Phone, Mail, MapPin, Briefcase } from 'lucide-react'
import Toast from "../../components/Toast"

export default function Profile() {
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState({ type: "", text: "" })
    const [showPassword, setShowPassword] = useState(false)

    const [profileData, setProfileData] = useState({
        username: "",
        password: "",
        full_name: "",
        department: "",
        mobile_number: ""
    })

    useEffect(() => {
        const username = sessionStorage.getItem("username")
        if (username) {
            fetchUserProfile(username)
        }
    }, [])

    const fetchUserProfile = async (username) => {
        try {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('username', username)
                .single()

            if (error) throw error

            setProfileData({
                username: data.username,
                password: data.password, // In a real app, don't fetch/show password like this
                full_name: data.full_name || "",
                department: data.department || "",
                mobile_number: data.mobile_number || ""
            })

        } catch (error) {
            console.error("Error fetching profile:", error)
            setMessage({ type: "error", text: "Failed to load profile data." })
        }
    }

    const handleSelfUpdate = async (e) => {
        e.preventDefault()
        setLoading(true)
        setMessage({ type: "", text: "" })

        try {
            // Validation
            if (!profileData.full_name?.trim()) throw new Error("Full Name is required")
            if (!profileData.mobile_number) throw new Error("Mobile number is required")
            if (!/^\d{10}$/.test(profileData.mobile_number)) {
                throw new Error("Mobile number must be exactly 10 digits")
            }

            const { error } = await supabase
                .from('users')
                .update({
                    password: profileData.password,
                    full_name: profileData.full_name,
                    mobile_number: profileData.mobile_number
                })
                .eq('username', sessionStorage.getItem("username"))

            if (error) throw error

            setMessage({ type: "success", text: "Profile updated successfully!" })
        } catch (error) {
            setMessage({ type: "error", text: error.message })
        } finally {
            setLoading(false)
        }
    }

    return (
        <AdminLayout>
            <div className="max-w-4xl mx-auto space-y-6 md:space-y-8 p-3 md:p-8 animate-in fade-in duration-500">
                {/* Header */}
                <div className="flex flex-col gap-1">
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">My Profile</h1>
                    <p className="text-gray-500">Manage your personal information</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column: User Card */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-white rounded-2xl md:rounded-3xl shadow-sm border border-gray-100 overflow-hidden text-center p-6 md:p-8">
                            <div className="relative inline-block mb-4">
                                <div className="h-24 w-24 rounded-full bg-[#FEF2F2] text-[#991B1B] flex items-center justify-center text-3xl font-bold border-4 border-white shadow-sm ring-1 ring-gray-100">
                                    {profileData.full_name ? profileData.full_name.charAt(0).toUpperCase() : 'U'}
                                </div>
                                <div className="absolute bottom-0 right-0 h-6 w-6 bg-green-500 border-4 border-white rounded-full sm:h-5 sm:w-5"></div>
                            </div>
                            <h2 className="text-xl font-bold text-gray-900">{profileData.full_name || "User Name"}</h2>
                            <p className="text-sm text-gray-500 font-medium mt-1">@{profileData.username}</p>

                            <div className="mt-6 md:mt-8 space-y-3 md:space-y-4 text-left border-t border-gray-50 pt-6 md:pt-8">
                                <div className="flex items-center gap-3 text-sm text-gray-600">
                                    <div className="flex-shrink-0 w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center group-hover:bg-red-50 transition-colors">
                                        <Briefcase size={14} className="text-gray-400" />
                                    </div>
                                    <span className="truncate">{profileData.department || "No Department"}</span>
                                </div>
                                <div className="flex items-center gap-3 text-sm text-gray-600">
                                    <div className="flex-shrink-0 w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center group-hover:bg-red-50 transition-colors">
                                        <Phone size={14} className="text-gray-400" />
                                    </div>
                                    <span>{profileData.mobile_number || "Not set"}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Edit Form */}
                    <div className="lg:col-span-2">
                        <div className="bg-white rounded-2xl md:rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="px-5 py-4 md:px-8 md:py-6 border-b border-gray-50 bg-gray-50/30">
                                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                    Basic Information
                                </h2>
                                <p className="text-sm text-gray-500 mt-1">Update your name and contact details.</p>
                            </div>

                            <form onSubmit={handleSelfUpdate} className="p-5 md:p-8 space-y-4 md:space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 ml-1">Username</label>
                                        <div className="relative group">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 group-focus-within:text-[#991B1B] transition-colors">
                                                <Lock size={16} />
                                            </div>
                                            <input
                                                type="text"
                                                disabled
                                                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-500 text-sm font-medium"
                                                value={profileData.username}
                                            />
                                        </div>
                                        <p className="text-[10px] text-gray-400 mt-1 ml-1 uppercase font-bold tracking-tight">System assigned • Non-editable</p>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 ml-1">Current Department</label>
                                        <div className="relative group">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 group-focus-within:text-[#991B1B] transition-colors">
                                                <Briefcase size={16} />
                                            </div>
                                            <input
                                                type="text"
                                                disabled
                                                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-500 text-sm font-medium"
                                                value={profileData.department}
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 ml-1 font-bold">Full Name <span className="text-red-500">*</span></label>
                                        <div className="relative group">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 group-focus-within:text-[#991B1B] transition-colors">
                                                <User size={16} />
                                            </div>
                                            <input
                                                type="text"
                                                required
                                                placeholder="e.g. John Doe"
                                                className="w-full pl-10 pr-4 py-2 md:py-2.5 rounded-xl border border-gray-200 focus:ring-4 focus:ring-[#991B1B]/5 focus:border-[#991B1B] outline-none transition-all text-sm font-medium"
                                                value={profileData.full_name}
                                                onChange={(e) => setProfileData({ ...profileData, full_name: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 ml-1 font-bold">Mobile Number <span className="text-red-500">*</span></label>
                                        <div className="relative group">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 group-focus-within:text-[#991B1B] transition-colors">
                                                <Phone size={16} />
                                            </div>
                                            <input
                                                type="text"
                                                required
                                                maxLength="10"
                                                placeholder="10-digit number"
                                                className="w-full pl-10 pr-4 py-2 md:py-2.5 rounded-xl border border-gray-200 focus:ring-4 focus:ring-[#991B1B]/5 focus:border-[#991B1B] outline-none transition-all text-sm font-medium"
                                                value={profileData.mobile_number}
                                                onChange={(e) => setProfileData({ ...profileData, mobile_number: e.target.value.replace(/\D/g, '') })}
                                            />
                                        </div>
                                    </div>

                                    <div className="md:col-span-2 space-y-4 pt-6 border-t border-gray-50 mt-2">
                                        <div className="flex flex-col gap-1">
                                            {/* <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Security</h3> */}
                                            <p className="text-xs text-gray-400">Change your account password below.</p>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 ml-1">New Password</label>
                                            <div className="relative group">
                                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 group-focus-within:text-[#991B1B] transition-colors">
                                                    <Lock size={16} />
                                                </div>
                                                <input
                                                    type={showPassword ? "text" : "password"}
                                                    placeholder="Enter new password to update"
                                                    className="w-full pl-10 pr-10 py-2 md:py-2.5 rounded-xl border border-gray-200 focus:ring-4 focus:ring-[#991B1B]/5 focus:border-[#991B1B] outline-none transition-all text-sm font-medium"
                                                    value={profileData.password}
                                                    onChange={(e) => setProfileData({ ...profileData, password: e.target.value })}
                                                />
                                                <button
                                                    type="button"
                                                    className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 transition-colors p-1"
                                                    onClick={() => setShowPassword(!showPassword)}
                                                >
                                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-8 border-t border-gray-100 flex justify-end">
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full sm:w-auto px-10 py-3 bg-[#991B1B] text-white rounded-2xl hover:bg-[#7f1616] transition-all disabled:opacity-50 flex items-center justify-center gap-2 font-bold text-sm shadow-lg shadow-red-900/10 hover:shadow-red-900/20 transform active:scale-95"
                                    >
                                        {loading ? (
                                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-b-white"></div>
                                        ) : (
                                            <Save size={18} />
                                        )}
                                        {loading ? "Saving Changes..." : "Save Profile Details"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>

                <Toast
                    message={message.text}
                    type={message.type}
                    onClose={() => setMessage({ type: "", text: "" })}
                />
            </div>
        </AdminLayout>
    )
}
