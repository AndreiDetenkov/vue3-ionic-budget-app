export type PredefinedIcon =
  | 'beauty'
  | 'clothes'
  | 'education'
  | 'entertainment'
  | 'food'
  | 'health'
  | 'housing'
  | 'other'
  | 'pets'
  | 'recreation'
  | 'shopping'
  | 'sport'
  | 'transportation'
  | 'utilities';

const localIcons = import.meta.glob('/src/assets/icons/*.png', { eager: true, import: 'default' }) as Record<
  string,
  string
>;

/**
 * Resolves a category's icon field to a valid image source URL.
 * Supports legacy remote URLs, future custom user upload URLs, and predefined local icons.
 */
export function getCategoryIconUrl(iconNameOrUrl: string | null | undefined): string {
  if (!iconNameOrUrl) {
    return localIcons['/src/assets/icons/other.png'] || '';
  }

  if (iconNameOrUrl.startsWith('http://') || iconNameOrUrl.startsWith('https://')) {
    return iconNameOrUrl;
  }

  const iconKey = iconNameOrUrl.replace('.png', '') as PredefinedIcon;
  const path = `/src/assets/icons/${iconKey}.png`;

  return localIcons[path] || localIcons['/src/assets/icons/other.png'] || '';
}
