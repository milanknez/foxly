import React from "react";
import {
  Table as TableIcon,
  Briefcase,
  Receipt,
  Boxes,
  FileSpreadsheet,
  Folder,
  Users,
  CheckSquare,
  Layers,
  Building2,
  Tag,
  Package,
  ShoppingCart,
  Calendar,
  DollarSign,
  Phone,
  Mail,
  FileText,
  Star,
  Shield,
  Activity,
  Truck,
  Clock,
  Database,
  Heart,
  Car,
  Wrench,
  Cpu,
  Globe,
  MapPin,
  Bookmark,
  Award,
  Scissors,
  Utensils,
} from "lucide-react";

export interface TableIconOption {
  key: string;
  label: string;
  icon: React.ElementType;
}

export const TABLE_ICON_LIST: TableIconOption[] = [
  { key: "Table", label: "Tabulka", icon: TableIcon },
  { key: "Briefcase", label: "Kufřík / Obchod", icon: Briefcase },
  { key: "Receipt", label: "Účtenka / Faktury", icon: Receipt },
  { key: "Boxes", label: "Sklad / Položky", icon: Boxes },
  { key: "Package", label: "Zásilky / Balíky", icon: Package },
  { key: "ShoppingCart", label: "Košík / Objednávky", icon: ShoppingCart },
  { key: "Users", label: "Uživatelé / Kontakty", icon: Users },
  { key: "Building2", label: "Firmy / Partneři", icon: Building2 },
  { key: "FileSpreadsheet", label: "Sešit / Reporty", icon: FileSpreadsheet },
  { key: "CheckSquare", label: "Úkoly / Checklisty", icon: CheckSquare },
  { key: "Layers", label: "Vrstvy / Projekty", icon: Layers },
  { key: "Calendar", label: "Kalendář / Události", icon: Calendar },
  { key: "Clock", label: "Čas / Docházka", icon: Clock },
  { key: "DollarSign", label: "Finance / Měna", icon: DollarSign },
  { key: "Tag", label: "Ceník / Štítky", icon: Tag },
  { key: "Truck", label: "Doprava / Vozidla", icon: Truck },
  { key: "Car", label: "Automobily", icon: Car },
  { key: "Wrench", label: "Servis / Údržba", icon: Wrench },
  { key: "FileText", label: "Smlouvy / Dokumenty", icon: FileText },
  { key: "Mail", label: "Zprávy / E-maily", icon: Mail },
  { key: "Phone", label: "Kontakty / Hovory", icon: Phone },
  { key: "Folder", label: "Složka / Kategorie", icon: Folder },
  { key: "Database", label: "Databáze / Číselníky", icon: Database },
  { key: "Star", label: "Hodnocení / Oblíbené", icon: Star },
  { key: "Shield", label: "Zabezpečení / Práva", icon: Shield },
  { key: "Activity", label: "Monitor / Zdraví", icon: Activity },
  { key: "Cpu", label: "IT / Hardware", icon: Cpu },
  { key: "Globe", label: "Web / Lokace", icon: Globe },
  { key: "MapPin", label: "Pobočky / Adresy", icon: MapPin },
  { key: "Bookmark", label: "Záložky", icon: Bookmark },
  { key: "Award", label: "Certifikace / Cíle", icon: Award },
  { key: "Heart", label: "Zdraví / Péče", icon: Heart },
  { key: "Scissors", label: "Kadeřnictví / Střih", icon: Scissors },
  { key: "Utensils", label: "Restaurace / Gastronomie", icon: Utensils },
];

export const TABLE_ICON_MAP: Record<string, React.ElementType> = TABLE_ICON_LIST.reduce(
  (acc, item) => {
    acc[item.key] = item.icon;
    return acc;
  },
  {} as Record<string, React.ElementType>
);

export function getTableIcon(iconName?: string | null): React.ElementType {
  if (!iconName) return TableIcon;
  return TABLE_ICON_MAP[iconName] || TableIcon;
}
