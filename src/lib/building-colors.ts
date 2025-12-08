// สีประจำแต่ละอาคาร - Mediterranean Palette
// ใช้ร่วมกันทั้งเว็บเพื่อให้ผู้ใช้จดจำได้ง่าย

export const BUILDING_COLORS: Record<string, string> = {
  '1': '#1d3557',  // Deep Space Blue - อาคาร 1
  '2': '#457b9d',  // Steel Blue - อาคาร 2
  '3': '#2a9d8f',  // Teal - อาคาร 3
  '4': '#e9c46a',  // Saffron Yellow - อาคาร 4
  '5': '#f4a261',  // Sandy Brown - อาคาร 5
}

// สีสำหรับ array index (เรียงตามลำดับ)
export const BUILDING_COLORS_ARRAY = [
  '#1d3557',  // Deep Space Blue - อาคาร 1
  '#457b9d',  // Steel Blue - อาคาร 2
  '#2a9d8f',  // Teal - อาคาร 3
  '#e9c46a',  // Saffron Yellow - อาคาร 4
  '#f4a261',  // Sandy Brown - อาคาร 5
]

// ฟังก์ชันดึงสีตาม building ID
export function getBuildingColor(buildingId: string | number): string {
  const id = String(buildingId)
  return BUILDING_COLORS[id] || '#6B7280' // fallback เป็นสีเทา
}

// ฟังก์ชันดึงสีตาม index
export function getBuildingColorByIndex(index: number): string {
  return BUILDING_COLORS_ARRAY[index % BUILDING_COLORS_ARRAY.length]
}

// สี Tailwind class สำหรับ background (ใช้กับ style inline)
export function getBuildingBgStyle(buildingId: string | number): React.CSSProperties {
  return {
    backgroundColor: getBuildingColor(buildingId),
    color: 'white',
  }
}

// สี Tailwind class สำหรับ border
export function getBuildingBorderStyle(buildingId: string | number): React.CSSProperties {
  return {
    borderLeftColor: getBuildingColor(buildingId),
    borderLeftWidth: '4px',
  }
}

// สีอ่อนสำหรับ background (opacity 10%)
export function getBuildingLightBgStyle(buildingId: string | number): React.CSSProperties {
  return {
    backgroundColor: `${getBuildingColor(buildingId)}15`,
  }
}
