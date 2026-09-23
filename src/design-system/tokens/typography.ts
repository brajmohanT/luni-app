import { StyleSheet } from 'react-native';

// Use the platform font until the font family is approved. Keep font scaling enabled.
export const typography = StyleSheet.create({
  title: { fontSize: 24, lineHeight: 30, fontWeight: '600' },
  dialogTitle: { fontSize: 22, lineHeight: 28, fontWeight: '600' },
  heading: { fontSize: 16, lineHeight: 22, fontWeight: '600' },
  body: { fontSize: 16, lineHeight: 22, fontWeight: '400' },
  message: { fontSize: 16, lineHeight: 22, fontWeight: '400' },
  label: { fontSize: 14, lineHeight: 20, fontWeight: '600' },
  button: { fontSize: 14, lineHeight: 22, fontWeight: '600' },
  secondary: { fontSize: 14, lineHeight: 20, fontWeight: '400' },
  caption: { fontSize: 12, lineHeight: 18, fontWeight: '400' },
  messageMeta: { fontSize: 12, lineHeight: 16, fontWeight: '400' },
});
