// The catalogue's garment_type is free text ("hoodie", "pullover hoodie",
// "short-sleeve T-shirt", "short-sleeve t-shirt", ...). Group it into a few
// shopper-friendly categories for filtering.

export const CATEGORIES = ['Hoodies', 'Crewnecks', 'T-shirts', 'Quarter-zips', 'Jackets & fleece', 'Long sleeves'] as const

export type Category = (typeof CATEGORIES)[number]

export function categoryOf(garmentType: string): Category | 'Other' {
  const t = garmentType.toLowerCase()
  if (t.includes('quarter-zip') || t.includes('1/4')) return 'Quarter-zips'
  if (t.includes('jacket') || t.includes('fleece')) return 'Jackets & fleece'
  if (t.includes('hood')) return 'Hoodies'
  if (t.includes('crewneck') || t.includes('mockneck') || t.includes('sweatshirt')) return 'Crewnecks'
  if (t.includes('long-sleeve')) return 'Long sleeves'
  if (t.includes('t-shirt')) return 'T-shirts'
  return 'Other'
}
