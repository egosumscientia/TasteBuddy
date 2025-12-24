import { StyleSheet } from 'react-native';
import { theme } from './theme';

export const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: theme.spacing(2.5),
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    lineHeight: 34,
    color: theme.colors.text,
    fontFamily: theme.fonts.family,
    marginBottom: theme.spacing(1),
  },
  subtitle: {
    fontSize: theme.fonts.sizes.lg,
    color: theme.colors.textSecondary,
    lineHeight: 22,
    fontFamily: theme.fonts.family,
    marginBottom: theme.spacing(2.5),
  },
  card: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing(2.25),
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing(2.5),
    ...theme.shadow.base,
  },
  button: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.lg,
    paddingVertical: theme.spacing(1.75),
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadow.base,
  },
  buttonText: {
    color: 'white',
    fontWeight: '800',
    fontSize: theme.fonts.sizes.md,
    fontFamily: theme.fonts.family,
  },
  chip: {
    backgroundColor: '#eef7f0',
    borderRadius: theme.radius.sm,
    paddingHorizontal: theme.spacing(1),
    paddingVertical: theme.spacing(0.5),
    marginRight: theme.spacing(1),
    marginBottom: theme.spacing(0.5),
  },
  chipText: {
    color: theme.colors.primaryDark,
    fontWeight: '600',
    fontFamily: theme.fonts.family,
  },
});

export { theme };
