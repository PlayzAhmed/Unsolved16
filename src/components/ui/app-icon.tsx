import React from 'react';
import {
  Landmark,
  Wallet,
  Plus,
  ArrowLeft,
  ArrowRight,
  Zap,
  Calculator,
  MessageSquare,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  X,
  ScanLine,
  Download,
  Leaf,
  Edit3,
  FileEdit,
  Compass,
  Users,
  Handshake,
  HelpCircle,
  History,
  LogIn,
  LogOut,
  CloudCheck,
  UserPlus,
  Image as ImageIcon,
  Unlock,
  Crosshair,
  Navigation,
  User,
  Camera,
  FileText,
  Printer,
  Receipt,
  RefreshCw,
  Minus,
  RotateCcw,
  Satellite,
  PiggyBank,
  Search,
  Shield,
  Share2,
  Sun,
  Maximize2,
  Store,
  Table,
  Lightbulb,
  TrendingDown,
  TrendingUp,
  Sliders,
  ShieldCheck,
  AlertTriangle,
  Check,
  type LucideProps,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface AppIconProps extends Omit<LucideProps, 'ref'> {
  name: string;
  className?: string;
  size?: number | string;
}

const ICON_MAP: Record<string, React.ComponentType<LucideProps>> = {
  account_balance: Landmark,
  account_balance_wallet: Wallet,
  add: Plus,
  arrow_back: ArrowLeft,
  arrow_forward: ArrowRight,
  arrow_forward_ios: ChevronRight,
  bakery_dining: Store,
  bolt: Zap,
  calculate: Calculator,
  chat: MessageSquare,
  check: Check,
  check_circle: CheckCircle2,
  chevron_left: ChevronLeft,
  chevron_right: ChevronRight,
  chevron_down: ChevronDown,
  expand_more: ChevronDown,
  close: X,
  document_scanner: ScanLine,
  download: Download,
  eco: Leaf,
  edit: Edit3,
  edit_note: FileEdit,
  energy_savings_leaf: Leaf,
  explore: Compass,
  groups: Users,
  handshake: Handshake,
  help_outline: HelpCircle,
  history: History,
  login: LogIn,
  logout: LogOut,
  person_add: UserPlus,
  cloud_done: CloudCheck,
  image: ImageIcon,
  lock_open: Unlock,
  my_location: Crosshair,
  near_me: Navigation,
  person: User,
  photo_camera: Camera,
  picture_as_pdf: FileText,
  print: Printer,
  receipt_long: Receipt,
  refresh: RefreshCw,
  remove: Minus,
  replay: RotateCcw,
  satellite_alt: Satellite,
  savings: PiggyBank,
  search: Search,
  security: Shield,
  share: Share2,
  solar_power: Sun,
  square_foot: Maximize2,
  store: Store,
  storefront: Store,
  sync: RefreshCw,
  table_chart: Table,
  tips_and_updates: Lightbulb,
  trending_down: TrendingDown,
  trending_up: TrendingUp,
  tune: Sliders,
  verified: ShieldCheck,
  verified_user: ShieldCheck,
  warning: AlertTriangle,
  wb_sunny: Sun,
  workspace_premium: ShieldCheck,
};

export function AppIcon({ name, className, size, style, ...props }: AppIconProps) {
  const cleanName = name ? name.trim().toLowerCase() : '';
  const IconComp = ICON_MAP[cleanName] || Sun;

  // Extract pixel size from className like text-[18px] or text-[24px] if size not specified
  let calculatedSize: number | undefined = typeof size === 'number' ? size : undefined;
  if (!calculatedSize && className) {
    const match = className.match(/text-\[(\d+)px\]/);
    if (match) {
      calculatedSize = parseInt(match[1], 10);
    }
  }

  return (
    <IconComp
      size={calculatedSize || 20}
      className={cn('inline-block shrink-0 stroke-[2.2]', className)}
      style={style}
      {...props}
    />
  );
}

export default AppIcon;
