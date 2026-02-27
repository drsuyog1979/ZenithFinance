import {
    Utensils, Car, HeartPulse, Home, Zap, Tv, Briefcase,
    TrendingUp, Phone, Banknote, Tag
} from "lucide-react";

export const CATEGORY_DEFAULTS = [
    { name: "Clinic", color: "#10b981", icon: Briefcase },
    { name: "Baramati", color: "#14b8a6", icon: Home },
    { name: "Mutual Funds", color: "#0ea5e9", icon: TrendingUp },
    { name: "Petrol", color: "#3b82f6", icon: Car },
    { name: "Salary", color: "#ef4444", icon: Banknote },
    { name: "Food & Drink", color: "#f97316", icon: Utensils },
    { name: "Electricity Bill", color: "#eab308", icon: Zap },
    { name: "App Purchase", color: "#8b5cf6", icon: Tv },
    { name: "Apollo", color: "#06b6d4", icon: HeartPulse },
    { name: "Inamdar", color: "#0891b2", icon: Briefcase },
    { name: "Sahyadri Deccan", color: "#2dd4bf", icon: HeartPulse },
    { name: "Sahyadri Bibwewadi", color: "#34d399", icon: HeartPulse },
    { name: "MNGL", color: "#f59e0b", icon: Zap },
    { name: "VI", color: "#a855f7", icon: Phone },
    { name: "Landline", color: "#d97706", icon: Phone },
    { name: "Other", color: "#94a3b8", icon: Tag },
];

export const CATEGORY_NAMES_DEFAULT = CATEGORY_DEFAULTS.map(c => c.name);
