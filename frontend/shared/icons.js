export const TYPE_ICONS = {
  village: '🌿', town: '🏘️', city: '🏙️',
  district: '🗺️', house: '🏠', default: '📍',
}

export const TYPE_LABELS = {
  village: 'Деревня', town: 'Посёлок', city: 'Город',
  district: 'Район', house: 'Дом', default: 'Место',
}

export const TYPE_ORDER = ['village', 'town', 'city', 'district', 'house']

export function getTypeIcon(type) { return TYPE_ICONS[type] || TYPE_ICONS.default }
export function getTypeLabel(type) { return TYPE_LABELS[type] || TYPE_LABELS.default }