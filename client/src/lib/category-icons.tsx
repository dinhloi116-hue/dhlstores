import type { LucideIcon } from "lucide-react";
import { BadgeCheck, BookMarked, BookOpen, Box, Camera, CircleDot, CircleGauge, Code2, Crop, Crown, Database, Dumbbell, FileCode2, FileImage, FileSpreadsheet, FileText, Flag, FolderArchive, Gem, Gift, Goal, Grid3X3, Hash, Headphones, Heart, Image, Layers3, Medal, Megaphone, Monitor, Music, Package, Palette, PenTool, Printer, Rocket, Scan, Scissors, Shapes, Shirt, ShoppingBag, Smartphone, Sparkles, Star, Sticker, Tags, Trophy, Type, Video, WandSparkles, Zap } from "lucide-react";

export type CategoryIconOption = { key: string; label: string; Icon: LucideIcon };

export const CATEGORY_ICON_OPTIONS: CategoryIconOption[] = [
  { key: "Package", label: "Gói hàng", Icon: Package }, { key: "Type", label: "Chữ", Icon: Type }, { key: "Hash", label: "Số", Icon: Hash }, { key: "Shapes", label: "Vector", Icon: Shapes }, { key: "Image", label: "Ảnh", Icon: Image },
  { key: "FileImage", label: "File ảnh", Icon: FileImage }, { key: "Palette", label: "Màu sắc", Icon: Palette }, { key: "Layers3", label: "Lớp thiết kế", Icon: Layers3 }, { key: "Sparkles", label: "Sáng tạo", Icon: Sparkles }, { key: "Shirt", label: "Áo đấu", Icon: Shirt },
  { key: "BadgeCheck", label: "Patch", Icon: BadgeCheck }, { key: "Sticker", label: "Sticker", Icon: Sticker }, { key: "Box", label: "Hộp", Icon: Box }, { key: "FolderArchive", label: "Lưu trữ", Icon: FolderArchive }, { key: "PenTool", label: "Bút thiết kế", Icon: PenTool },
  { key: "Crop", label: "Cắt ảnh", Icon: Crop }, { key: "Scan", label: "Quét", Icon: Scan }, { key: "Printer", label: "In ấn", Icon: Printer }, { key: "Scissors", label: "Cắt", Icon: Scissors }, { key: "WandSparkles", label: "Công cụ", Icon: WandSparkles },
  { key: "Megaphone", label: "Quảng bá", Icon: Megaphone }, { key: "Trophy", label: "Thể thao", Icon: Trophy }, { key: "Medal", label: "Huy chương", Icon: Medal }, { key: "Goal", label: "Khung thành", Icon: Goal }, { key: "CircleDot", label: "Bóng", Icon: CircleDot },
  { key: "Dumbbell", label: "Thể lực", Icon: Dumbbell }, { key: "Flag", label: "Cờ", Icon: Flag }, { key: "Star", label: "Nổi bật", Icon: Star }, { key: "Crown", label: "Cao cấp", Icon: Crown }, { key: "Gem", label: "Đặc biệt", Icon: Gem },
  { key: "Rocket", label: "Mới", Icon: Rocket }, { key: "Zap", label: "Nhanh", Icon: Zap }, { key: "Camera", label: "Chụp ảnh", Icon: Camera }, { key: "Video", label: "Video", Icon: Video }, { key: "Music", label: "Âm thanh", Icon: Music },
  { key: "Headphones", label: "Tai nghe", Icon: Headphones }, { key: "BookOpen", label: "Tài liệu", Icon: BookOpen }, { key: "BookMarked", label: "Bộ sưu tập", Icon: BookMarked }, { key: "FileText", label: "Văn bản", Icon: FileText }, { key: "FileCode2", label: "Mã nguồn", Icon: FileCode2 },
  { key: "FileSpreadsheet", label: "Bảng tính", Icon: FileSpreadsheet }, { key: "Database", label: "Dữ liệu", Icon: Database }, { key: "Code2", label: "Lập trình", Icon: Code2 }, { key: "Monitor", label: "Màn hình", Icon: Monitor }, { key: "Smartphone", label: "Di động", Icon: Smartphone },
  { key: "ShoppingBag", label: "Mua sắm", Icon: ShoppingBag }, { key: "Tags", label: "Nhãn", Icon: Tags }, { key: "Gift", label: "Ưu đãi", Icon: Gift }, { key: "Heart", label: "Yêu thích", Icon: Heart }, { key: "CircleGauge", label: "Hiệu suất", Icon: CircleGauge },
  { key: "Grid3X3", label: "Khác", Icon: Grid3X3 },
];

const iconByKey = Object.fromEntries(CATEGORY_ICON_OPTIONS.map(option => [option.key, option.Icon])) as Record<string, LucideIcon>;

export function getCategoryIcon(iconKey?: string): LucideIcon {
  return iconByKey[iconKey || ""] || Package;
}
