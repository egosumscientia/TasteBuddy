export const theme = {
  colors: {
    primary: '#28a745',
    primaryDark: '#1f8a49',
    accent: '#f7b733',
    background: '#ffffff',
    surface: '#f7f8f9',
    textPrimary: '#1f2937',
    textSecondary: '#4b5563',
    textMuted: '#6b7280',
    text: '#1f2937',
    textSecondaryAlt: '#4b5563',
    border: '#e1e4e8',
  },
  fonts: {
    sizes: { xs: 12, sm: 14, md: 16, lg: 20, xl: 24, xxl: 32 },
    family: 'Nunito, sans-serif',
  },
  spacing: (factor) => factor * 8,
  radius: { sm: 6, md: 12, lg: 20 },
  shadow: {
    base: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
  },
};
