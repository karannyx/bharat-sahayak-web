"use client";

import { useState, useEffect, useRef } from "react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://bharat-sahayak-api.onrender.com';

interface Scheme {
  id: number;
  name_en: string;
  name_hi?: string;
  category?: string;
  level?: string;
  state?: string;
  status: string;
  benefit?: string;
  process?: string;
  deadline?: string;
  official_url?: string;
  source_org?: string;
}

interface ChatMessage {
  sender: "bot" | "user";
  text: string;
}

const UI_TEXT = {
  en: {
    portalBadge: "Government of India Citizen Services Gateway",
    title: "Bharat Sahayak",
    subtitle: "Centralized Access to Verified Welfare Schemes, Subsidies & Scholarships",
    searchPlaceholder: "Search by scheme name, ministry, keyword (e.g. Kisan, Scholarship, Beti)...",
    searchBtn: "Find Schemes",
    clearBtn: "Reset",
    addBtn: "+ Submit New Scheme",
    bookmarksBtn: "Saved",
    eligibilityTitle: "Target Demographics",
    all: "All Citizens",
    student: "Students & Youth",
    farmer: "Agriculture & Farmers",
    woman: "Women & Child Care",
    statsTotal: "Verified Schemes",
    statsActive: "Active Applications",
    statsSaved: "Your Bookmarks",
    sortBy: "Order:",
    sortNewest: "Newest Additions",
    sortAZ: "Alphabetical (A-Z)",
    perPage: "Show:",
    prev: "Previous",
    next: "Next",
    page: "Page",
    of: "of",
    noSchemes: "No government programs found matching your current parameters.",
    viewDetails: "Examine Details",
    dept: "Administrative Body / Ministry:",
    benefit: "Key Welfare Entitlements:",
    process: "Application Workflow:",
    deadline: "Deadline / Validity:",
    applyPortal: "Proceed to Official Portal",
    closeBtn: "Dismiss",
    editTitle: "Modify Scheme Metadata",
    addTitle: "Register Official Scheme",
    saveBtn: "Commit Scheme",
    updateBtn: "Update Record",
    exportBtn: "Export CSV",
    adminLock: "Admin Login",
    adminActive: "Admin Active",
    aiAssistantTitle: "AI Sahayak Chatbot",
    aiPlaceholder: "Ask anything (e.g. 'I am a farmer looking for subsidy')...",
  },
  hi: {
    portalBadge: "भारत सरकार नागरिक सेवा पोर्टल",
    title: "भारत सहायक",
    subtitle: "प्रमाणित सरकारी योजनाओं, अनुदानों एवं छात्रवृत्तियों का केंद्रीय मंच",
    searchPlaceholder: "योजना का नाम, मंत्रालय या शब्द खोजें (जैसे किसान, छात्रवृत्ति, बेटी)...",
    searchBtn: "योजनाएं खोजें",
    clearBtn: "रीसेट करें",
    addBtn: "+ नई योजना दर्ज करें",
    bookmarksBtn: "सहेजे गए",
    eligibilityTitle: "लक्षित वर्ग चयन",
    all: "समस्त नागरिक",
    student: "विद्यार्थी एवं युवा",
    farmer: "कृषि एवं कृषक",
    woman: "महिलाएं एवं बालिकाएं",
    statsTotal: "प्रमाणित योजनाएं",
    statsActive: "सक्रिय आवेदन",
    statsSaved: "सहेजी गई योजनाएं",
    sortBy: "क्रमबद्ध:",
    sortNewest: "नवीनतम पहले",
    sortAZ: "वर्णमाला (अ से ज्ञ)",
    perPage: "संख्या:",
    prev: "पिछला",
    next: "अगला",
    page: "पृष्ठ",
    of: "का",
    noSchemes: "आपके चुने हुए मानदंडों के अनुसार कोई योजना उपलब्ध नहीं है।",
    viewDetails: "पूर्ण विवरण देखें",
    dept: "प्रशासनिक निकाय / मंत्रालय:",
    benefit: "मुख्य लाभ एवं सहायता:",
    process: "आवेदन प्रक्रिया:",
    deadline: "अंतिम तिथि / वैधता:",
    applyPortal: "आधिकारिक पोर्टल पर आवेदन करें",
    closeBtn: "बंद करें",
    editTitle: "योजना विवरण संशोधित करें",
    addTitle: "नई सरकारी योजना दर्ज करें",
    saveBtn: "सुरक्षित करें",
    updateBtn: "अद्यतन करें",
    exportBtn: "CSV डाउनलोड",
    adminLock: "व्यवस्थापक लॉगिन",
    adminActive: "व्यवस्थापक मोड",
    aiAssistantTitle: "एआई सहायक बॉट",
    aiPlaceholder: "कुछ भी पूछें (जैसे: 'मुझे किसान योजनाओं के बारे में बताएं')...",
  },
};

const CATEGORY_TAGS = [
  { label: "All Schemes", hi: "सभी योजनाएं", query: "" },
  { label: "Scholarships", hi: "छात्रवृत्तियां", query: "Scholarship" },
  { label: "Agriculture", hi: "कृषि कल्याण", query: "Kisan" },
  { label: "Girl Child", hi: "बालिका उत्थान", query: "Beti" },
  { label: "Madhya Pradesh", hi: "मध्य प्रदेश", query: "Madhya Pradesh" },
];

export default function Home() {
  const [schemes, setSchemes] = useState<Scheme[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState("All Schemes");
  const [loading, setLoading] = useState(false);
  const [selectedScheme, setSelectedScheme] = useState<Scheme | null>(null);

  // Localization
  const [lang, setLang] = useState<"en" | "hi">("en");
  const t = UI_TEXT[lang];

  // Bookmarks
  const [bookmarkedIds, setBookmarkedIds] = useState<number[]>([]);
  const [showBookmarksOnly, setShowBookmarksOnly] = useState(false);
  const [eligibilityRole, setEligibilityRole] = useState("all");

  // Sorting & Pagination
  const [sortBy, setSortBy] = useState<"newest" | "name">("newest");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(6);

  // Admin Auth Guard (Default Admin Passcode: 1234)
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminPin, setAdminPin] = useState("");

  // AI Chat Assistant State
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      sender: "bot",
      text: "Namaste! I am your AI Bharat Sahayak. Tell me your background (e.g. 'I am a 12th passed student' or 'Farmer with 2 acres of land') and I'll find the right schemes for you!",
    },
  ]);
  const [userInput, setUserInput] = useState("");
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // CRUD Modal State
  const [modalMode, setModalMode] = useState<"add" | "edit" | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name_en: "",
    name_hi: "",
    source_org: "",
    benefit: "",
    process: "",
    official_url: "",
    status: "Active",
  });
  const [formSubmitting, setFormSubmitting] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("bs_bookmarks");
      if (saved) setBookmarkedIds(JSON.parse(saved));
      const savedLang = localStorage.getItem("bs_lang") as "en" | "hi";
      if (savedLang) setLang(savedLang);
      const savedAdmin = localStorage.getItem("bs_is_admin");
      if (savedAdmin === "true") setIsAdmin(true);
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, isChatOpen]);

  const handleLangChange = (newLang: "en" | "hi") => {
    setLang(newLang);
    localStorage.setItem("bs_lang", newLang);
  };

  const toggleBookmark = (id: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const updated = bookmarkedIds.includes(id)
      ? bookmarkedIds.filter((item) => item !== id)
      : [...bookmarkedIds, id];
    setBookmarkedIds(updated);
    localStorage.setItem("bs_bookmarks", JSON.stringify(updated));
  };

  const fetchSchemes = async (query = "") => {
    setLoading(true);
    try {
      const endpoint = query.trim()
        ? `${API_BASE_URL}/api/v1/schemes/search?q=${encodeURIComponent(query)}`
        : `${API_BASE_URL}/api/v1/schemes`;

      const res = await fetch(endpoint);
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();
      setSchemes(data.data || []);
      setCurrentPage(1);
    } catch (err) {
      console.error("Failed to fetch schemes:", err);
      setSchemes([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchemes();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setActiveFilter("");
    setShowBookmarksOnly(false);
    fetchSchemes(searchTerm);
  };

  const handleQuickFilter = (label: string, query: string) => {
    setActiveFilter(label);
    setSearchTerm(query);
    setShowBookmarksOnly(false);
    fetchSchemes(query);
  };

  const handleClear = () => {
    setSearchTerm("");
    setActiveFilter("All Schemes");
    setShowBookmarksOnly(false);
    setEligibilityRole("all");
    fetchSchemes("");
  };

  // CSV Export
  const exportToCSV = () => {
    if (schemes.length === 0) return alert("No records to export.");
    const headers = ["ID", "Name (EN)", "Name (HI)", "Department", "Status", "Official URL", "Benefit"];
    const rows = schemes.map((s) => [
      s.id,
      `"${(s.name_en || "").replace(/"/g, '""')}"`,
      `"${(s.name_hi || "").replace(/"/g, '""')}"`,
      `"${(s.source_org || "").replace(/"/g, '""')}"`,
      s.status || "Active",
      `"${s.official_url || ""}"`,
      `"${(s.benefit || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Bharat_Sahayak_Schemes_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Admin Verification (Passcode: 1234)
  const handleAdminAuth = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPin === "1234") {
      setIsAdmin(true);
      localStorage.setItem("bs_is_admin", "true");
      setShowAdminModal(false);
      setAdminPin("");
    } else {
      alert("Invalid Admin Passcode. Default test passcode is 1234.");
    }
  };

  const handleAdminLogout = () => {
    setIsAdmin(false);
    localStorage.removeItem("bs_is_admin");
  };

  // AI Assistant Engine
  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    const query = userInput.trim().toLowerCase();
    if (!query) return;

    const newChat: ChatMessage[] = [...chatMessages, { sender: "user", text: userInput }];
    setUserInput("");

    let reply = "";
    if (query.includes("farmer") || query.includes("kisan") || query.includes("khet") || query.includes("agriculture")) {
      const match = schemes.filter((s) => `${s.name_en} ${s.benefit}`.toLowerCase().includes("kisan") || `${s.name_en} ${s.benefit}`.toLowerCase().includes("farmer"));
      reply = match.length
        ? `I found ${match.length} programs for farmers, such as "${match[0].name_en}". Check the Agriculture category filter for direct applications!`
        : "Under the PM-Kisan & state agricultural programs, farmers receive financial support. Apply under the 'Agriculture' tab!";
    } else if (query.includes("student") || query.includes("study") || query.includes("scholarship") || query.includes("college") || query.includes("school")) {
      const match = schemes.filter((s) => `${s.name_en} ${s.benefit}`.toLowerCase().includes("scholarship") || `${s.name_en} ${s.benefit}`.toLowerCase().includes("vidyarthi"));
      reply = match.length
        ? `Found ${match.length} education schemes! Prime recommendation: "${match[0].name_en}". Use the 'Students' eligibility pill above to view all.`
        : "Scholarship schemes cover tuition fees and stipends for school/college students based on merit and income.";
    } else if (query.includes("girl") || query.includes("woman") || query.includes("women") || query.includes("beti") || query.includes("mahila")) {
      reply = "Welfare initiatives like 'Ladli Laxmi' and 'Sukanya Samriddhi' empower female citizens with financial assistance and higher education grants.";
    } else {
      reply = "I understand! You can search any keyword in the search bar above or click the eligibility chips to narrow down state and central benefits.";
    }

    setChatMessages([...newChat, { sender: "bot", text: reply }]);
  };

  // CRUD Actions Guarded by Admin Status
  const openAddModal = () => {
    if (!isAdmin) {
      setShowAdminModal(true);
      return;
    }
    setFormData({
      name_en: "",
      name_hi: "",
      source_org: "",
      benefit: "",
      process: "",
      official_url: "",
      status: "Active",
    });
    setEditingId(null);
    setModalMode("add");
  };

  const openEditModal = (scheme: Scheme, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!isAdmin) {
      setShowAdminModal(true);
      return;
    }
    setFormData({
      name_en: scheme.name_en || "",
      name_hi: scheme.name_hi || "",
      source_org: scheme.source_org || "",
      benefit: scheme.benefit || "",
      process: scheme.process || "",
      official_url: scheme.official_url || "",
      status: scheme.status || "Active",
    });
    setEditingId(scheme.id);
    setModalMode("edit");
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name_en.trim()) return;

    setFormSubmitting(true);
    try {
      const isEdit = modalMode === "edit";
      const url = isEdit
        ? `${API_BASE_URL}/api/v1/schemes/${editingId}`
        : `${API_BASE_URL}/api/v1/schemes`;

      const res = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setModalMode(null);
        fetchSchemes(searchTerm);
      } else {
        alert("Operation failed. Verify API server status.");
      }
    } catch (err) {
      console.error(err);
      alert("Error contacting API server.");
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDeleteScheme = async (id: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!isAdmin) {
      setShowAdminModal(true);
      return;
    }
    if (!window.confirm("Admin Confirmation: Remove this scheme permanently?")) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/schemes/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        if (selectedScheme?.id === id) setSelectedScheme(null);
        fetchSchemes(searchTerm);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Filter & Sorter Pipelines
  const filteredSchemes = schemes.filter((s) => {
    if (showBookmarksOnly && !bookmarkedIds.includes(s.id)) return false;

    if (eligibilityRole === "student") {
      const text = `${s.name_en} ${s.name_hi || ""} ${s.benefit || ""}`.toLowerCase();
      return (
        text.includes("scholarship") ||
        text.includes("vidyarthi") ||
        text.includes("education") ||
        text.includes("merit") ||
        text.includes("विद्यार्थी") ||
        text.includes("छात्रवृत्ति")
      );
    }
    if (eligibilityRole === "farmer") {
      const text = `${s.name_en} ${s.name_hi || ""} ${s.benefit || ""}`.toLowerCase();
      return (
        text.includes("kisan") ||
        text.includes("farmer") ||
        text.includes("agriculture") ||
        text.includes("किसान")
      );
    }
    if (eligibilityRole === "woman") {
      const text = `${s.name_en} ${s.name_hi || ""} ${s.benefit || ""}`.toLowerCase();
      return (
        text.includes("beti") ||
        text.includes("women") ||
        text.includes("girl") ||
        text.includes("बेटी") ||
        text.includes("महिला")
      );
    }
    return true;
  });

  const sortedSchemes = [...filteredSchemes].sort((a, b) => {
    if (sortBy === "name") {
      const titleA = (lang === "hi" && a.name_hi ? a.name_hi : a.name_en).toLowerCase();
      const titleB = (lang === "hi" && b.name_hi ? b.name_hi : b.name_en).toLowerCase();
      return titleA.localeCompare(titleB);
    }
    return b.id - a.id;
  });

  const totalPages = Math.ceil(sortedSchemes.length / itemsPerPage) || 1;
  const paginatedSchemes = sortedSchemes.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 selection:bg-amber-100 selection:text-amber-900 font-sans pb-16">
      {/* Tricolor Accent Strip */}
      <div className="h-1.5 w-full bg-gradient-to-r from-orange-500 via-white to-emerald-600 shadow-sm" />

      {/* Main Navigation Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-700 to-blue-900 flex items-center justify-center text-white font-black text-xl shadow-md border border-indigo-200">
              भ
            </div>
            <div>
              <span className="text-[10px] font-bold tracking-widest text-orange-600 uppercase block">
                {t.portalBadge}
              </span>
              <h1 className="text-xl font-extrabold text-slate-900 leading-tight">
                {t.title}
              </h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Language Switcher */}
            <div className="bg-slate-100 p-1 rounded-full border border-slate-300 flex text-xs font-semibold">
              <button
                onClick={() => handleLangChange("en")}
                className={`px-3 py-1 rounded-full transition ${lang === "en" ? "bg-white text-blue-700 shadow-sm font-bold" : "text-slate-600"
                  }`}
              >
                EN
              </button>
              <button
                onClick={() => handleLangChange("hi")}
                className={`px-3 py-1 rounded-full transition ${lang === "hi" ? "bg-white text-blue-700 shadow-sm font-bold" : "text-slate-600"
                  }`}
              >
                हिन्दी
              </button>
            </div>

            {/* CSV Export Button */}
            <button
              onClick={exportToCSV}
              className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1 transition"
            >
              📥 {t.exportBtn}
            </button>

            {/* Bookmarks Toggle */}
            <button
              onClick={() => setShowBookmarksOnly(!showBookmarksOnly)}
              className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition ${showBookmarksOnly
                ? "bg-amber-500 text-white border-amber-600 shadow-sm"
                : "bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
                }`}
            >
              <span>{showBookmarksOnly ? "★" : "☆"}</span>
              <span>{t.bookmarksBtn}</span>
              <span className="bg-slate-100 text-slate-800 px-1.5 py-0.2 rounded-full text-[10px]">
                {bookmarkedIds.length}
              </span>
            </button>

            {/* Admin Toggle / Status */}
            {isAdmin ? (
              <button
                onClick={handleAdminLogout}
                className="px-3 py-1.5 bg-emerald-100 border border-emerald-300 text-emerald-800 font-bold text-xs rounded-lg hover:bg-red-50 hover:text-red-700 hover:border-red-300 transition"
                title="Click to Logout"
              >
                🔒 {t.adminActive}
              </button>
            ) : (
              <button
                onClick={() => setShowAdminModal(true)}
                className="px-3 py-1.5 bg-slate-100 border border-slate-300 text-slate-700 font-semibold text-xs rounded-lg hover:bg-slate-200 transition"
              >
                🛡️ {t.adminLock}
              </button>
            )}

            {/* Add Scheme Action */}
            <button
              onClick={openAddModal}
              className="px-3.5 py-1.5 bg-blue-700 hover:bg-blue-800 text-white font-semibold text-xs rounded-lg transition shadow-sm"
            >
              {t.addBtn}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        {/* Hero Section */}
        <section className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-2xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden">
          <div className="relative z-10 max-w-2xl space-y-2">
            <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              {lang === "hi"
                ? "प्रत्येक नागरिक के उत्थान के लिए आधिकारिक मंच"
                : "Empowering Citizens with Direct Scheme Access"}
            </h2>
            <p className="text-slate-300 text-sm md:text-base leading-relaxed">
              {t.subtitle}
            </p>
          </div>

          <div className="mt-6 grid grid-cols-3 gap-3 md:gap-4 max-w-lg">
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/15">
              <span className="text-[11px] text-slate-300 block">{t.statsTotal}</span>
              <span className="text-xl font-black text-white">{schemes.length}</span>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/15">
              <span className="text-[11px] text-slate-300 block">{t.statsActive}</span>
              <span className="text-xl font-black text-emerald-400">
                {schemes.filter((s) => s.status === "Active").length}
              </span>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/15">
              <span className="text-[11px] text-slate-300 block">{t.statsSaved}</span>
              <span className="text-xl font-black text-amber-400">{bookmarkedIds.length}</span>
            </div>
          </div>
        </section>

        {/* Filter Panel */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm space-y-4">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3.5 top-3 text-slate-400 text-base">🔍</span>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={t.searchPlaceholder}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition"
              />
            </div>
            <button
              type="submit"
              className="px-5 py-2.5 bg-blue-700 hover:bg-blue-800 text-white font-medium text-sm rounded-lg transition shadow-sm"
            >
              {t.searchBtn}
            </button>
            {(searchTerm || activeFilter !== "All Schemes" || showBookmarksOnly || eligibilityRole !== "all") && (
              <button
                type="button"
                onClick={handleClear}
                className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium text-sm rounded-lg transition"
              >
                {t.clearBtn}
              </button>
            )}
          </form>

          {/* Demographics Badges */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 text-xs">
            <span className="font-bold text-slate-600 uppercase tracking-wider text-[11px]">
              {t.eligibilityTitle}
            </span>
            <div className="flex flex-wrap gap-2">
              {[
                { role: "all", label: t.all, icon: "🇮🇳" },
                { role: "student", label: t.student, icon: "🎓" },
                { role: "farmer", label: t.farmer, icon: "🌾" },
                { role: "woman", label: t.woman, icon: "👩" },
              ].map((item) => (
                <button
                  key={item.role}
                  type="button"
                  onClick={() => {
                    setEligibilityRole(item.role);
                    setCurrentPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-lg font-medium border flex items-center gap-1.5 transition ${eligibilityRole === item.role
                    ? "bg-blue-700 border-blue-700 text-white shadow-sm"
                    : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                    }`}
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Quick Category Chips */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {CATEGORY_TAGS.map((tag) => {
              const label = lang === "hi" ? tag.hi : tag.label;
              const isActive = activeFilter === tag.label && !showBookmarksOnly;
              return (
                <button
                  key={tag.label}
                  onClick={() => handleQuickFilter(tag.label, tag.query)}
                  className={`px-3 py-1 rounded-md text-xs font-medium border transition ${isActive
                    ? "bg-slate-900 border-slate-900 text-white"
                    : "bg-white border-slate-200 text-slate-600 hover:border-slate-400"
                    }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Controls Sub-bar */}
        <div className="flex flex-wrap items-center justify-between text-xs text-slate-600 px-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold">{t.sortBy}</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as "newest" | "name")}
              className="bg-white border border-slate-300 rounded px-2.5 py-1 text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-600"
            >
              <option value="newest">{t.sortNewest}</option>
              <option value="name">{t.sortAZ}</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-semibold">{t.perPage}</span>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-white border border-slate-300 rounded px-2.5 py-1 text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-600"
            >
              <option value={4}>4</option>
              <option value={6}>6</option>
              <option value={10}>10</option>
            </select>
          </div>
        </div>

        {/* 2-Column Responsive Card Grid */}
        {loading ? (
          <div className="text-center py-16 text-slate-500 text-sm">Loading citizen programs...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {paginatedSchemes.length === 0 ? (
              <div className="col-span-full bg-white p-12 text-center rounded-xl border border-slate-200 text-slate-500 text-sm">
                {t.noSchemes}
              </div>
            ) : (
              paginatedSchemes.map((scheme) => {
                const isBookmarked = bookmarkedIds.includes(scheme.id);
                const primaryName =
                  lang === "hi" && scheme.name_hi ? scheme.name_hi : scheme.name_en;
                const secondaryName =
                  lang === "hi" && scheme.name_hi ? scheme.name_en : scheme.name_hi;

                return (
                  <div
                    key={scheme.id}
                    onClick={() => setSelectedScheme(scheme)}
                    className="bg-white rounded-xl border border-slate-200 hover:border-blue-400 p-5 shadow-sm hover:shadow-md transition duration-200 flex flex-col justify-between cursor-pointer group"
                  >
                    <div>
                      <div className="flex justify-between items-start gap-2 mb-2">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {scheme.status || "Active"}
                        </span>
                        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={(e) => toggleBookmark(scheme.id, e)}
                            className="text-base p-1 text-slate-400 hover:text-amber-500 transition"
                            title="Save"
                          >
                            {isBookmarked ? "★" : "☆"}
                          </button>
                          {isAdmin && (
                            <>
                              <button
                                onClick={(e) => openEditModal(scheme, e)}
                                className="text-xs p-1 text-slate-400 hover:text-blue-600 transition"
                                title="Edit"
                              >
                                ✎
                              </button>
                              <button
                                onClick={(e) => handleDeleteScheme(scheme.id, e)}
                                className="text-xs p-1 text-slate-400 hover:text-red-600 transition"
                                title="Delete"
                              >
                                ✕
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      <h3 className="font-bold text-base text-slate-900 group-hover:text-blue-700 transition line-clamp-1">
                        {primaryName}
                      </h3>
                      {secondaryName && (
                        <p className="text-xs text-slate-500 mb-3 line-clamp-1 font-medium">
                          {secondaryName}
                        </p>
                      )}

                      {scheme.benefit && (
                        <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed mb-4 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                          <strong className="text-slate-800">{t.benefit}</strong> {scheme.benefit}
                        </p>
                      )}
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex justify-between items-center text-[11px] text-slate-500">
                      <span className="truncate max-w-[60%] font-medium">
                        🏛️ {scheme.source_org || "Ministry of Social Justice"}
                      </span>
                      <span className="text-blue-700 font-bold group-hover:underline">
                        {t.viewDetails} &rarr;
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Bottom Pagination */}
        {!loading && sortedSchemes.length > 0 && (
          <div className="flex justify-between items-center pt-4 border-t border-slate-200 text-xs text-slate-600">
            <div>
              {t.page} <span className="font-bold text-slate-900">{currentPage}</span> {t.of}{" "}
              <span className="font-bold text-slate-900">{totalPages}</span>
            </div>
            <div className="flex gap-1.5">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 border border-slate-300 rounded-md bg-white hover:bg-slate-50 disabled:opacity-40 transition font-medium"
              >
                {t.prev}
              </button>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 border border-slate-300 rounded-md bg-white hover:bg-slate-50 disabled:opacity-40 transition font-medium"
              >
                {t.next}
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Floating AI Sahayak Chatbot */}
      <div className="fixed bottom-5 right-5 z-40">
        {!isChatOpen ? (
          <button
            onClick={() => setIsChatOpen(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-800 hover:to-indigo-800 text-white px-4 py-3 rounded-full shadow-2xl transition transform hover:scale-105"
          >
            <span className="text-xl">🤖</span>
            <span className="text-xs font-bold">{t.aiAssistantTitle}</span>
          </button>
        ) : (
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-80 sm:w-96 flex flex-col h-[480px] overflow-hidden">
            <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white p-3 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="text-lg">🤖</span>
                <span className="text-xs font-bold">{t.aiAssistantTitle}</span>
              </div>
              <button
                onClick={() => setIsChatOpen(false)}
                className="text-slate-300 hover:text-white font-bold text-sm px-1.5"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 p-3 overflow-y-auto space-y-2.5 text-xs bg-slate-50">
              {chatMessages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] p-2.5 rounded-xl ${msg.sender === "user"
                      ? "bg-blue-600 text-white rounded-br-none"
                      : "bg-white text-slate-800 border border-slate-200 shadow-sm rounded-bl-none"
                      }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
              <div ref={chatBottomRef} />
            </div>

            <form onSubmit={handleSendChat} className="p-2.5 border-t border-slate-200 bg-white flex gap-1.5">
              <input
                type="text"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder={t.aiPlaceholder}
                className="flex-1 px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:bg-white"
              />
              <button
                type="submit"
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs"
              >
                Send
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Admin Authentication Modal */}
      {showAdminModal && (
        <div
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          onClick={() => setShowAdminModal(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-sm font-bold text-slate-900">🛡️ Admin Verification Required</h3>
              <button onClick={() => setShowAdminModal(false)} className="text-slate-400 text-sm font-bold">✕</button>
            </div>
            <p className="text-xs text-slate-600 mb-3">
              Modifying, creating, or deleting scheme records requires government administrative clearance.
            </p>
            <form onSubmit={handleAdminAuth} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Enter Security Passcode (Test: 1234)
                </label>
                <input
                  type="password"
                  required
                  value={adminPin}
                  onChange={(e) => setAdminPin(e.target.value)}
                  placeholder="••••"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-center tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2 bg-blue-700 hover:bg-blue-800 text-white font-semibold text-xs rounded-lg transition"
              >
                Authenticate
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Scheme Detail View Modal */}
      {selectedScheme && (
        <div
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedScheme(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start border-b border-slate-100 pb-3">
              <div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200 uppercase">
                  Scheme ID #{selectedScheme.id}
                </span>
                <h3 className="text-xl font-extrabold text-slate-900 mt-1">
                  {lang === "hi" && selectedScheme.name_hi
                    ? selectedScheme.name_hi
                    : selectedScheme.name_en}
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  {lang === "hi" ? selectedScheme.name_en : selectedScheme.name_hi}
                </p>
              </div>
              <button
                onClick={() => setSelectedScheme(null)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3.5 text-xs text-slate-700">
              {selectedScheme.source_org && (
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <strong className="text-slate-900 block font-semibold mb-0.5">{t.dept}</strong>
                  <span>{selectedScheme.source_org}</span>
                </div>
              )}
              {selectedScheme.benefit && (
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <strong className="text-slate-900 block font-semibold mb-0.5">{t.benefit}</strong>
                  <span className="leading-relaxed">{selectedScheme.benefit}</span>
                </div>
              )}
              {selectedScheme.process && (
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <strong className="text-slate-900 block font-semibold mb-0.5">{t.process}</strong>
                  <span className="leading-relaxed">{selectedScheme.process}</span>
                </div>
              )}
            </div>

            <div className="border-t border-slate-100 pt-4 flex gap-2 justify-end">
              <button
                onClick={() => setSelectedScheme(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 font-semibold text-xs transition"
              >
                {t.closeBtn}
              </button>
              {selectedScheme.official_url && (
                <a
                  href={selectedScheme.official_url}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg font-semibold text-xs transition shadow-sm"
                >
                  {t.applyPortal} &rarr;
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CRUD Form Modal */}
      {modalMode && (
        <div
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          onClick={() => setModalMode(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                {modalMode === "edit" ? t.editTitle : t.addTitle}
              </h3>
              <button
                onClick={() => setModalMode(null)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Scheme Name (English) *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name_en}
                  onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Scheme Name (Hindi)
                </label>
                <input
                  type="text"
                  value={formData.name_hi}
                  onChange={(e) => setFormData({ ...formData, name_hi: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Department / Ministry
                </label>
                <input
                  type="text"
                  value={formData.source_org}
                  onChange={(e) => setFormData({ ...formData, source_org: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Benefits</label>
                <textarea
                  rows={2}
                  value={formData.benefit}
                  onChange={(e) => setFormData({ ...formData, benefit: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Application Workflow
                </label>
                <textarea
                  rows={2}
                  value={formData.process}
                  onChange={(e) => setFormData({ ...formData, process: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Official Portal URL
                </label>
                <input
                  type="url"
                  value={formData.official_url}
                  onChange={(e) => setFormData({ ...formData, official_url: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div className="border-t border-slate-100 pt-3 flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setModalMode(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 font-semibold transition"
                >
                  {t.closeBtn}
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-5 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg font-semibold transition disabled:opacity-50 shadow-sm"
                >
                  {formSubmitting
                    ? "..."
                    : modalMode === "edit"
                      ? t.updateBtn
                      : t.saveBtn}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}