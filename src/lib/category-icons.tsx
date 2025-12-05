import {
  Zap,
  Droplets,
  Wifi,
  Tv,
  Youtube,
  Users,
  Megaphone,
  Package,
  Coffee,
  Cookie,
  Fuel,
  ParkingCircle,
  Wrench,
  Building2,
  Bus,
  Plane,
  Map,
  UtensilsCrossed,
  Car,
  Hotel,
  CreditCard,
  DollarSign,
  Receipt,
  Globe,
  Home,
  Bed,
  type LucideIcon,
} from 'lucide-react'

// สี icons
const iconColors: Record<string, string> = {
  // รายได้
  'Direct Booking': 'text-blue-600',
  'AirBNB': 'text-pink-500',
  'Booking': 'text-blue-500',
  'Agoda': 'text-red-500',
  'Trip': 'text-blue-400',
  'Expedia': 'text-yellow-600',
  'RB': 'text-purple-500',
  'ช่องทางอื่น': 'text-gray-500',
  'ค่าอาหาร': 'text-orange-500',
  'รับส่งสนามบิน': 'text-cyan-500',
  'ค่าทัวร์': 'text-green-500',
  'Thai Bus Food Tour': 'text-amber-600',
  'Co Van Kessel': 'text-teal-600',
  // รายจ่าย
  'ค่าไฟฟ้า': 'text-yellow-500',
  'ค่าน้ำประปา': 'text-blue-400',
  'Internet': 'text-blue-600',
  'Netflix': 'text-red-600',
  'Youtube': 'text-red-500',
  'เงินเดือนพนักงาน': 'text-green-600',
  'การตลาด': 'text-purple-500',
  'Amenity': 'text-pink-400',
  'น้ำเปล่า': 'text-cyan-400',
  'คุ้กกี้': 'text-amber-500',
  'กาแฟ': 'text-amber-700',
  'น้ำมัน': 'text-gray-600',
  'ที่จอดรถ': 'text-slate-500',
  'ซ่อมบำรุงรถ': 'text-orange-600',
  'ซ่อมบำรุงอาคาร': 'text-amber-600',
  'เดินทางแม่บ้าน': 'text-violet-500',
  'Little Hotelier': 'text-teal-500',
}

// Function เพื่อหา icon ที่เหมาะสมจากชื่อ category
export function getCategoryIcon(name: string): { Icon: LucideIcon, color: string } {
  const lowerName = name.toLowerCase()

  // รายได้
  if (lowerName.includes('direct booking')) {
    return { Icon: CreditCard, color: iconColors['Direct Booking'] }
  }
  if (lowerName.includes('airbnb')) {
    return { Icon: Home, color: iconColors['AirBNB'] }
  }
  if (lowerName.includes('booking') && !lowerName.includes('direct')) {
    return { Icon: Bed, color: iconColors['Booking'] }
  }
  if (lowerName.includes('agoda')) {
    return { Icon: Globe, color: iconColors['Agoda'] }
  }
  if (lowerName.includes('trip')) {
    return { Icon: Plane, color: iconColors['Trip'] }
  }
  if (lowerName.includes('expedia')) {
    return { Icon: Globe, color: iconColors['Expedia'] }
  }
  if (lowerName.includes('rb') || lowerName.includes('roombix')) {
    return { Icon: Hotel, color: iconColors['RB'] }
  }
  if (lowerName.includes('ช่องทางอื่น')) {
    return { Icon: DollarSign, color: iconColors['ช่องทางอื่น'] }
  }

  // รายได้ Upsell
  if (lowerName.includes('อาหาร')) {
    return { Icon: UtensilsCrossed, color: iconColors['ค่าอาหาร'] }
  }
  if (lowerName.includes('สนามบิน') || lowerName.includes('รับส่ง')) {
    return { Icon: Car, color: iconColors['รับส่งสนามบิน'] }
  }
  if (lowerName.includes('ทัวร์') && !lowerName.includes('thai bus')) {
    return { Icon: Map, color: iconColors['ค่าทัวร์'] }
  }
  if (lowerName.includes('thai bus')) {
    return { Icon: Bus, color: iconColors['Thai Bus Food Tour'] }
  }
  if (lowerName.includes('co van kessel')) {
    return { Icon: Map, color: iconColors['Co Van Kessel'] }
  }

  // รายจ่าย
  if (lowerName.includes('ไฟฟ้า')) {
    return { Icon: Zap, color: iconColors['ค่าไฟฟ้า'] }
  }
  if (lowerName.includes('น้ำประปา') || lowerName.includes('ประปา')) {
    return { Icon: Droplets, color: iconColors['ค่าน้ำประปา'] }
  }
  if (lowerName.includes('internet')) {
    return { Icon: Wifi, color: iconColors['Internet'] }
  }
  if (lowerName.includes('netflix')) {
    return { Icon: Tv, color: iconColors['Netflix'] }
  }
  if (lowerName.includes('youtube')) {
    return { Icon: Youtube, color: iconColors['Youtube'] }
  }
  if (lowerName.includes('เงินเดือน') || lowerName.includes('พนักงาน')) {
    return { Icon: Users, color: iconColors['เงินเดือนพนักงาน'] }
  }
  if (lowerName.includes('การตลาด')) {
    return { Icon: Megaphone, color: iconColors['การตลาด'] }
  }
  if (lowerName.includes('amenity') || lowerName.includes('แปรงสีฟัน')) {
    return { Icon: Package, color: iconColors['Amenity'] }
  }
  if (lowerName.includes('น้ำเปล่า')) {
    return { Icon: Droplets, color: iconColors['น้ำเปล่า'] }
  }
  if (lowerName.includes('คุ้กกี้') || lowerName.includes('ขนม')) {
    return { Icon: Cookie, color: iconColors['คุ้กกี้'] }
  }
  if (lowerName.includes('กาแฟ') || lowerName.includes('คอฟฟี่')) {
    return { Icon: Coffee, color: iconColors['กาแฟ'] }
  }
  if (lowerName.includes('น้ำมัน')) {
    return { Icon: Fuel, color: iconColors['น้ำมัน'] }
  }
  if (lowerName.includes('ที่จอดรถ') || lowerName.includes('เช่าที่จอด')) {
    return { Icon: ParkingCircle, color: iconColors['ที่จอดรถ'] }
  }
  if (lowerName.includes('ซ่อมบำรุงรถ') || lowerName.includes('มอเตอร์ไซค์')) {
    return { Icon: Wrench, color: iconColors['ซ่อมบำรุงรถ'] }
  }
  if (lowerName.includes('ซ่อมบำรุงอาคาร')) {
    return { Icon: Building2, color: iconColors['ซ่อมบำรุงอาคาร'] }
  }
  if (lowerName.includes('เดินทาง') || lowerName.includes('แม่บ้าน')) {
    return { Icon: Bus, color: iconColors['เดินทางแม่บ้าน'] }
  }
  if (lowerName.includes('little hotelier') || lowerName.includes('hotelier')) {
    return { Icon: Hotel, color: iconColors['Little Hotelier'] }
  }

  // Default
  return { Icon: Receipt, color: 'text-gray-400' }
}

// Component สำหรับแสดง icon
export function CategoryIcon({ name, className = 'h-4 w-4' }: { name: string, className?: string }) {
  const { Icon, color } = getCategoryIcon(name)
  return <Icon className={`${className} ${color}`} />
}
