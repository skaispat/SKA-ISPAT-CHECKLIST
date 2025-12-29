import { useState, useEffect } from "react"
import AdminLayout from "../../components/layout/AdminLayout"
import { supabase } from "../../supabase"
import { User, Lock, Save, UserPlus, Edit2, X, Search, Eye, EyeOff, AlertTriangle } from 'lucide-react'
import Toast from "../../components/Toast"

const AVAILABLE_PAGES = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'tasks', label: 'My Tasks' },
    { id: 'completed_tasks', label: 'Completed Tasks' },
    { id: 'assign_task', label: 'Assign Task' },
    { id: 'profile', label: 'Profile' },
    { id: 'license', label: 'License' },
    { id: 'training', label: 'Training Video' },
    { id: 'data', label: 'Data Pages' }
]

export default function Settings() {

    const [userRole, setUserRole] = useState("")
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState({ type: "", text: "" })

    // User Management State (Admin)
    const [users, setUsers] = useState([])
    const [departments, setDepartments] = useState([])
    const [searchQuery, setSearchQuery] = useState("")
    const [isEditing, setIsEditing] = useState(false)
    const [showUserForm, setShowUserForm] = useState(false)
    const [showPassword, setShowPassword] = useState(false)

    // Form State (Used for Create & Edit)
    const [formData, setFormData] = useState({
        emp_id: "", // Read-only for edit, ignored for create
        username: "",
        password: "",
        role: "user",
        department: "",
        full_name: "",
        dept_id: null,
        user_access: []
    })

    // Profile State (For non-admin or self-update)
    const [profileData, setProfileData] = useState({
        username: "",
        password: "",
        full_name: "",
        department: ""
    })

    useEffect(() => {
        const role = sessionStorage.getItem("role")
        const username = sessionStorage.getItem("username")
        setUserRole(role)

        if (username) {
            fetchUserProfile(username)
        }

        if (role === 'admin') {
            fetchUsers()
            fetchDepartments()
        }
    }, [])

    const fetchDepartments = async () => {
        try {
            const { data, error } = await supabase
                .from('departments')
                .select('dept_id, dept_name')
                .eq('is_active', true)
                .order('dept_name')

            if (error) throw error
            setDepartments(data || [])
        } catch (error) {
            console.error("Error fetching departments:", error)
        }
    }

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
                password: data.password,
                full_name: data.full_name || "",
                department: data.department || ""
            })

        } catch (error) {
            console.error("Error fetching profile:", error)
        }
    }

    const fetchUsers = async () => {
        try {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .order('emp_id', { ascending: true })

            if (error) throw error
            setUsers(data)
        } catch (error) {
            console.error("Error fetching users:", error)
        }
    }

    const resetForm = () => {
        setFormData({
            emp_id: "",
            username: "",
            password: "",
            role: "user",
            department: "",
            full_name: "",
            dept_id: null,
            // Default access: All pages except 'assign_task'
            user_access: AVAILABLE_PAGES.filter(p => p.id !== 'assign_task').map(p => p.id)
        })
        setIsEditing(false)
        setShowUserForm(false)
        setShowPassword(false)
        setMessage({ type: "", text: "" })
    }

    const handleEditClick = (user) => {
        setFormData({
            emp_id: user.emp_id,
            username: user.username,
            password: user.password || "",
            role: user.role,
            department: user.department || "",
            full_name: user.full_name || "",
            dept_id: user.dept_id,
            user_access: user.user_access ? user.user_access.split(',') : []
        })
        setIsEditing(true)
        setShowUserForm(true)
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    // Toggle Modal State
    const [toggleModal, setToggleModal] = useState({ show: false, user: null })

    const handleToggleStatus = (user) => {
        const action = user.status === 'active' ? 'disable' : 'enable'

        if (action === 'disable') {
            setToggleModal({ show: true, user })
        } else {
            executeStatusToggle(user)
        }
    }

    const executeStatusToggle = async (user) => {
        const newStatus = user.status === 'active' ? 'inactive' : 'active'
        const action = user.status === 'active' ? 'disable' : 'enable'

        try {
            const { error } = await supabase
                .from('users')
                .update({ status: newStatus })
                .eq('emp_id', user.emp_id)

            if (error) throw error

            setMessage({ type: "success", text: `User ${action}d successfully` })
            fetchUsers()
            setToggleModal({ show: false, user: null })
        } catch (error) {
            setMessage({ type: "error", text: error.message })
        }
    }

    const handleFormSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)
        setMessage({ type: "", text: "" })

        try {
            // Validation
            if (!formData.full_name?.trim()) throw new Error("Full Name is required")
            if (!formData.username?.trim()) throw new Error("Username is required")
            if (!formData.role) throw new Error("Role is required")
            if (!formData.dept_id) throw new Error("Department is required")
            if (!isEditing && !formData.password) throw new Error("Password is required for new users")

            // Username validation: lowercase alphanumeric only, no spaces
            const usernameRegex = /^[a-z0-9]+$/
            if (!usernameRegex.test(formData.username)) {
                throw new Error("Username must contain only lowercase letters and numbers, with no spaces or special characters.")
            }

            const userAccessString = formData.role === 'admin' ? 'all' : (formData.user_access || []).join(',')

            if (isEditing) {
                // Update existing user
                const { error } = await supabase
                    .from('users')
                    .update({
                        username: formData.username,
                        password: formData.password,
                        role: formData.role,
                        department: formData.department,
                        full_name: formData.full_name,
                        dept_id: formData.dept_id,
                        user_access: userAccessString
                    })
                    .eq('emp_id', formData.emp_id)

                if (error) throw error
            } else {
                // Create new user
                const payload = {
                    ...formData,
                    user_access: userAccessString
                }
                delete payload.emp_id

                const { error } = await supabase
                    .from('users')
                    .insert([payload])

                if (error) throw error
            }

            fetchUsers()
            const successText = isEditing ? "User updated successfully!" : "User created successfully!"
            resetForm()
            setMessage({ type: "success", text: successText })
        } catch (error) {
            setMessage({ type: "error", text: error.message })
        } finally {
            setLoading(false)
        }
    }

    const handleSelfUpdate = async (e) => {
        e.preventDefault()
        setLoading(true)
        setMessage({ type: "", text: "" })

        try {
            const { error } = await supabase
                .from('users')
                .update({
                    password: profileData.password,
                    full_name: profileData.full_name,
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

    const filteredUsers = users.filter(user => {
        if (!searchQuery) return true
        const query = searchQuery.toLowerCase()
        return (
            user.full_name?.toLowerCase().includes(query) ||
            user.username?.toLowerCase().includes(query) ||
            user.department?.toLowerCase().includes(query)
        )
    })

    return (
        <AdminLayout>
            <div className="max-w-6xl mx-auto space-y-8 p-4 md:p-8 animate-in fade-in duration-500">
                {/* Header */}
                <div className="flex flex-col gap-1">
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Settings</h1>
                    <p className="text-gray-500">
                        {userRole === 'admin' ? "Manage system users and permissions." : "Manage your personal profile."}
                    </p>
                </div>


                {/* User Management Section (Admin Only) */}
                {userRole === "admin" && (
                    <div className="space-y-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                    User Management
                                </h2>
                                <p className="text-sm text-gray-500 mt-1">View and manage system users and permissions.</p>
                            </div>
                            <button
                                onClick={() => {
                                    resetForm()
                                    setShowUserForm(true)
                                }}
                                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#991B1B] text-white hover:bg-[#7f1616] hover:shadow transition-all flex items-center justify-center gap-2 font-semibold text-sm shadow-sm"
                            >
                                <UserPlus size={16} /> Add New User
                            </button>
                        </div>

                        {/* User Form Modal */}
                        {showUserForm && (
                            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                                <div
                                    className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto scale-100 animate-in zoom-in-95 duration-200"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <div className="px-5 py-4 md:px-8 md:py-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 sticky top-0 z-10 backdrop-blur-md">
                                        <div>
                                            <h3 className="text-lg font-bold text-gray-900">
                                                {isEditing ? "Edit User Details" : "Create New User"}
                                            </h3>
                                            <p className="text-sm text-gray-500 mt-1">
                                                {isEditing ? "Update the user's information below." : "Fill in the details to add a new user."}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => setShowUserForm(false)}
                                            className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-100 rounded-full transition-colors"
                                        >
                                            <X size={20} />
                                        </button>
                                    </div>
                                    <form onSubmit={handleFormSubmit} className="p-4 md:p-8 space-y-4 md:space-y-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                                            {isEditing && (
                                                <div className="space-y-2">
                                                    <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">ID</label>
                                                    <input
                                                        type="text"
                                                        disabled
                                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-500 text-sm font-medium"
                                                        value={formData.emp_id}
                                                    />
                                                </div>
                                            )}
                                            <div className="space-y-2">
                                                <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Full Name</label>
                                                <input
                                                    type="text"
                                                    required
                                                    placeholder="e.g. John Doe"
                                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#991B1B]/10 focus:border-[#991B1B] outline-none transition-all text-sm"
                                                    value={formData.full_name}
                                                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Username</label>
                                                <input
                                                    type="text"
                                                    required
                                                    placeholder="e.g. johndoe"
                                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#991B1B]/10 focus:border-[#991B1B] outline-none transition-all text-sm"
                                                    value={formData.username}
                                                    onChange={(e) => setFormData({ ...formData, username: e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '') })}
                                                />
                                                <p className="text-[10px] text-gray-400 mt-1">Only lowercase letters and numbers allowed.</p>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Password</label>
                                                <div className="relative">
                                                    <input
                                                        type={showPassword ? "text" : "password"}
                                                        required={!isEditing}
                                                        placeholder={isEditing ? "Leave empty to keep current" : "Set initial password"}
                                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#991B1B]/10 focus:border-[#991B1B] outline-none transition-all text-sm pr-10"
                                                        value={formData.password}
                                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                                    />
                                                    <button
                                                        type="button"
                                                        className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 transition-colors"
                                                        onClick={() => setShowPassword(!showPassword)}
                                                    >
                                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Role</label>
                                                <div className="relative">
                                                    <select
                                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#991B1B]/10 focus:border-[#991B1B] outline-none transition-all appearance-none bg-white text-sm"
                                                        value={formData.role}
                                                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                                    >
                                                        <option value="user">User</option>
                                                        <option value="admin">Admin</option>
                                                    </select>
                                                    <div className="absolute right-4 top-3 pointer-events-none text-gray-400">
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Department</label>
                                                <div className="relative">
                                                    <select
                                                        required
                                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#991B1B]/10 focus:border-[#991B1B] outline-none transition-all appearance-none bg-white text-sm"
                                                        value={formData.dept_id || ""}
                                                        onChange={(e) => {
                                                            const selectedDeptId = e.target.value;
                                                            const selectedDept = departments.find(d => d.dept_id.toString() === selectedDeptId);
                                                            setFormData({
                                                                ...formData,
                                                                dept_id: selectedDeptId,
                                                                department: selectedDept ? selectedDept.dept_name : ""
                                                            });
                                                        }}
                                                    >
                                                        <option value="">Select Department</option>
                                                        {departments.map(dept => (
                                                            <option key={dept.dept_id} value={dept.dept_id}>
                                                                {dept.dept_name}
                                                            </option>
                                                        ))}
                                                    </select>
                                                    <div className="absolute right-4 top-3 pointer-events-none text-gray-400">
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* User Access Control - Only for role 'user' */}
                                        <div className="space-y-3 pt-2 border-t border-gray-50">
                                            <div className="flex justify-between items-center">
                                                <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">User Access Permissions</label>
                                                {formData.role === 'admin' && (
                                                    <span className="text-[10px] font-bold bg-green-50 text-green-700 px-2 py-0.5 rounded-full">
                                                        ADMIN: ALL ACCESS
                                                    </span>
                                                )}
                                            </div>

                                            {formData.role === 'user' ? (
                                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">

                                                    {AVAILABLE_PAGES.map((page) => (
                                                        <label key={page.id} className="flex items-center gap-2 p-2 rounded-lg border border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors">
                                                            <div className="relative flex items-center">
                                                                <input
                                                                    type="checkbox"
                                                                    className="peer h-4 w-4 rounded border-gray-300 text-[#991B1B] focus:ring-[#991B1B]/20"
                                                                    checked={formData.user_access?.includes(page.id)}
                                                                    onChange={(e) => {
                                                                        const currentAccess = formData.user_access || [];
                                                                        let newAccess;
                                                                        if (e.target.checked) {
                                                                            newAccess = [...currentAccess, page.id];
                                                                        } else {
                                                                            newAccess = currentAccess.filter(id => id !== page.id);
                                                                        }
                                                                        setFormData({ ...formData, user_access: newAccess });
                                                                    }}
                                                                />
                                                            </div>
                                                            <span className="text-sm text-gray-700">{page.label}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="p-3 bg-gray-50 border border-gray-100 rounded-xl text-sm text-gray-500 italic text-center">
                                                    Administrator accounts have default access to all system pages.
                                                </div>
                                            )}
                                        </div>

                                        <div className="pt-4 md:pt-6 flex flex-col-reverse sm:flex-row justify-end gap-3 border-t border-gray-100">
                                            <button
                                                type="button"
                                                onClick={() => setShowUserForm(false)}
                                                className="w-full sm:w-auto px-6 py-2.5 border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 transition-colors font-medium text-sm"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="submit"
                                                disabled={loading}
                                                className="w-full sm:w-auto px-6 py-2.5 bg-[#991B1B] text-white rounded-xl hover:bg-[#7f1616] transition-colors disabled:opacity-50 flex items-center justify-center gap-2 font-medium text-sm shadow-sm"
                                            >
                                                {loading ? "Processing..." : (isEditing ? "Update User" : "Create User")}
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        )}

                        {/* List */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="p-4 sm:p-6 border-b border-gray-50 flex flex-col sm:flex-row gap-4 justify-between items-center bg-gray-50/30">
                                <div className="relative w-full sm:max-w-md">
                                    <Search className="absolute left-3.5 top-2.5 text-gray-400" size={18} />
                                    <input
                                        type="text"
                                        placeholder="Search users by name, username or department..."
                                        className="w-full pl-11 pr-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#991B1B]/10 focus:border-[#991B1B] transition-all text-sm bg-white"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </div>
                                <div className="text-xs text-gray-400 font-medium">
                                    Showing {filteredUsers.length} users
                                </div>
                            </div>
                            <div className="hidden md:block overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-50">
                                    <thead>
                                        <tr className="bg-gray-50/50">
                                            <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">ID</th>
                                            <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">User Details</th>
                                            <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Role</th>
                                            <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Department</th>
                                            <th scope="col" className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50 bg-white">
                                        {filteredUsers.length > 0 ? filteredUsers.map((user) => {
                                            const isCurrentUser = user.username === sessionStorage.getItem("username");
                                            return (
                                                <tr
                                                    key={user.emp_id}
                                                    className={`transition-colors group ${isCurrentUser
                                                        ? "bg-[#FEF2F2]/60 hover:bg-[#FEF2F2]"
                                                        : user.status === 'inactive' ? "bg-gray-50 opacity-75" : "hover:bg-gray-50/60"
                                                        }`}
                                                >
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400 font-mono">
                                                        #{user.emp_id}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div>
                                                            <div className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                                                                {user.full_name}
                                                                {isCurrentUser && (
                                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#991B1B] text-white">
                                                                        YOU
                                                                    </span>
                                                                )}
                                                                {user.status === 'inactive' && (
                                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-200 text-gray-600">
                                                                        DISABLED
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="text-xs text-gray-500">@{user.username}</div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${user.role === 'admin'
                                                            ? 'bg-purple-50 text-purple-700 ring-1 ring-inset ring-purple-100'
                                                            : 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-100'
                                                            }`}>
                                                            {user.role}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                                        {user.department || <span className="text-gray-300 italic">None</span>}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                        <div className="flex items-center justify-end gap-2">
                                                            <button
                                                                onClick={() => handleEditClick(user)}
                                                                className="p-2 text-gray-500 hover:text-[#991B1B] hover:bg-red-50 rounded-lg transition-colors"
                                                                title="Edit"
                                                            >
                                                                <Edit2 size={16} />
                                                            </button>
                                                            {!isCurrentUser && (
                                                                <label className="relative inline-flex items-center cursor-pointer">
                                                                    <input
                                                                        type="checkbox"
                                                                        className="sr-only peer"
                                                                        checked={user.status === 'active'}
                                                                        onChange={() => handleToggleStatus(user)}
                                                                    />
                                                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#991B1B]"></div>
                                                                </label>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        }) : (
                                            <tr>
                                                <td colSpan="5" className="px-6 py-12 text-center">
                                                    <div className="flex flex-col items-center gap-2 text-gray-400">
                                                        <User size={32} className="opacity-20" />
                                                        <p>No users found matching your search.</p>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile User List */}
                            <div className="md:hidden divide-y divide-gray-50">
                                {filteredUsers.length > 0 ? filteredUsers.map((user) => {
                                    const isCurrentUser = user.username === sessionStorage.getItem("username");
                                    return (
                                        <div key={user.emp_id} className={`p-4 space-y-3 ${isCurrentUser ? 'bg-[#FEF2F2]/60' : user.status === 'inactive' ? 'opacity-75 bg-gray-50' : ''}`}>
                                            <div className="flex justify-between items-start">
                                                <div className="flex items-center gap-2">
                                                    <div className="text-sm font-semibold text-gray-900">{user.full_name}</div>
                                                    {isCurrentUser && (
                                                        <span className="text-[10px] font-bold bg-[#991B1B] text-white px-2 py-0.5 rounded-full">YOU</span>
                                                    )}
                                                    {user.status === 'inactive' && (
                                                        <span className="text-[10px] font-bold bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">DISABLED</span>
                                                    )}
                                                </div>
                                                <span className={`text-[10px] font-medium px-2 py-1 rounded-md ${user.role === 'admin'
                                                    ? 'bg-purple-50 text-purple-700 ring-1 ring-inset ring-purple-100'
                                                    : 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-100'
                                                    }`}>
                                                    {user.role}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center text-xs text-gray-500">
                                                <div>@{user.username}</div>
                                                <div>{user.department || 'No Dept'}</div>
                                            </div>
                                            <div className="flex justify-between items-center pt-2 border-t border-gray-50/50 mt-2">
                                                <span className="text-xs font-mono text-gray-400">#{user.emp_id}</span>
                                                <div className="flex items-center gap-2">
                                                    <button onClick={() => handleEditClick(user)} className="p-2 text-gray-500 bg-gray-50 rounded-lg hover:text-[#991B1B] hover:bg-red-50 transition-colors">
                                                        <Edit2 size={14} />
                                                    </button>
                                                    {!isCurrentUser && (
                                                        <label className="relative inline-flex items-center cursor-pointer scale-75 origin-right">
                                                            <input type="checkbox" className="sr-only peer" checked={user.status === 'active'} onChange={() => handleToggleStatus(user)} />
                                                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#991B1B]"></div>
                                                        </label>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                }) : (
                                    <div className="p-8 text-center text-gray-400 text-sm">
                                        <div className="flex flex-col items-center gap-2">
                                            <User size={32} className="opacity-20" />
                                            <p>No users found matching your search.</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Profile Section (Non-Admin Only) */}
                {userRole !== "admin" && (
                    <div className="pt-4">
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="px-8 py-6 border-b border-gray-50">
                                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                    Profile Settings
                                </h2>
                                <p className="text-sm text-gray-500 mt-1">Update your personal information and password.</p>
                            </div>

                            <form onSubmit={handleSelfUpdate} className="p-5 md:p-8 space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Username</label>
                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    disabled
                                                    className="w-full pl-4 pr-10 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-500 text-sm"
                                                    value={profileData.username}
                                                />
                                                <Lock className="absolute right-3 top-2.5 text-gray-400 opacity-50" size={16} />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Full Name</label>
                                            <input
                                                type="text"
                                                required
                                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#991B1B]/10 focus:border-[#991B1B] outline-none transition-all text-sm"
                                                value={profileData.full_name}
                                                onChange={(e) => setProfileData({ ...profileData, full_name: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">New Password</label>
                                            <div className="relative">
                                                <input
                                                    type={showPassword ? "text" : "password"}
                                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#991B1B]/10 focus:border-[#991B1B] outline-none transition-all text-sm pr-10"
                                                    value={profileData.password}
                                                    onChange={(e) => setProfileData({ ...profileData, password: e.target.value })}
                                                    placeholder="Enter new password to update"
                                                />
                                                <button
                                                    type="button"
                                                    className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 transition-colors"
                                                    onClick={() => setShowPassword(!showPassword)}
                                                >
                                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                                </button>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Department</label>
                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    disabled
                                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-500 text-sm"
                                                    value={profileData.department}
                                                />
                                                <Lock className="absolute right-3 top-2.5 text-gray-400 opacity-50" size={16} />
                                            </div>
                                            <p className="text-[10px] text-gray-400 mt-1.5 uppercase font-medium">Managed by admin</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-6 border-t border-gray-50 flex justify-end">
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full sm:w-auto px-8 py-2.5 bg-[#991B1B] text-white rounded-xl hover:bg-[#7f1616] transition-all disabled:opacity-50 flex items-center justify-center gap-2 font-medium text-sm shadow-md hover:shadow-lg transform active:scale-95"
                                    >
                                        <Save size={16} />
                                        {loading ? "Saving..." : "Save Changes"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
                {/* Custom Confirmation Modal */}
                {toggleModal.show && toggleModal.user && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                        <div
                            className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden scale-100 animate-in zoom-in-95 duration-200"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="p-6 text-center space-y-4">
                                <div className="w-12 h-12 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto">
                                    <AlertTriangle size={24} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900">Disable User?</h3>
                                    <p className="text-sm text-gray-500 mt-2">
                                        Do you want to disable <span className="font-semibold text-gray-900">{toggleModal.user.full_name}</span>?
                                    </p>
                                </div>
                                <div className="flex gap-3 pt-2">
                                    <button
                                        onClick={() => setToggleModal({ show: false, user: null })}
                                        className="flex-1 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium text-sm"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={() => executeStatusToggle(toggleModal.user)}
                                        className="flex-1 px-4 py-2 bg-[#991B1B] text-white rounded-xl hover:bg-[#7f1616] transition-colors font-medium text-sm shadow-sm"
                                    >
                                        Yes, Disable
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                {/* Toast Notification */}
                <Toast
                    message={message.text}
                    type={message.type}
                    onClose={() => setMessage({ type: "", text: "" })}
                />
            </div>
        </AdminLayout>
    )
}
