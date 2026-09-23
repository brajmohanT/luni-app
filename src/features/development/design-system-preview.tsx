import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { BrandBackground, Button, IconButton, LuniLogo, SettingsRow, Switch, TextField } from '@/design-system/components';
import { useTheme, type Theme, type ThemePreference } from '@/design-system/theme';

export function DesignSystemPreview() {
  const router = useRouter();
  const { theme, preference, setPreference } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [name, setName] = useState('Alex');
  const [email, setEmail] = useState('alex@');
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);
  const [reminders, setReminders] = useState(false);
  const [standaloneSwitch, setStandaloneSwitch] = useState(true);
  const [appearanceOpen, setAppearanceOpen] = useState(false);
  const [status, setStatus] = useState('Try a control below. These examples do not save account data.');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const save = () => {
    if (timer.current) return;
    setLoading(true);
    setStatus('Saving sample…');
    timer.current = setTimeout(() => {
      timer.current = null;
      setLoading(false);
      setStatus('Sample saved. No account data changed.');
    }, 1500);
  };

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style={theme.mode === 'dark' ? 'light' : 'dark'} />
      <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
          <View style={styles.header}>
            <Text accessibilityRole="header" style={styles.title}>Design System</Text>
            <IconButton accessibilityLabel="Close design system" onPress={() => {
              if (router.canGoBack()) router.back();
              else router.replace('/');
            }} icon={({ color, size }) => (
              <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8}>
                <Path d="m6 6 12 12M6 18 18 6" strokeLinecap="round" />
              </Svg>
            )} />
          </View>
          <Text style={styles.secondary}>Development preview · {theme.mode} appearance</Text>
          <View style={styles.row}>
            {(['light', 'dark', 'system'] as ThemePreference[]).map(mode => (
              <Button key={mode} variant={preference === mode ? 'primary' : 'outlined'}
                accessibilityState={{ selected: preference === mode }}
                onPress={() => setPreference(mode)}>{mode[0].toUpperCase() + mode.slice(1)}</Button>
            ))}
          </View>

          <Text accessibilityRole="header" style={styles.heading}>Brand</Text>
          <Text style={styles.secondary}>Identity artwork</Text>
          <BrandBackground style={styles.art}><LuniLogo size={110} /></BrandBackground>
          <Text style={styles.secondary}>Welcome artwork</Text>
          <BrandBackground variant="welcome" style={styles.art}><LuniLogo size={70} /></BrandBackground>

          <Text accessibilityRole="header" style={styles.heading}>Buttons</Text>
          <Text accessibilityLiveRegion="polite" style={styles.secondary}>{status}</Text>
          <Button onPress={() => setStatus('Primary button pressed.')}>Continue</Button>
          <Button variant="outlined" onPress={() => setStatus('Outlined button pressed.')}>Cancel</Button>
          <Button variant="destructive" onPress={() => setStatus('Destructive style pressed. Nothing was deleted.')}>Delete sample</Button>
          <Button loading={loading} loadingLabel="Saving…" onPress={save}>Try loading state</Button>
          <Button disabled>Disabled button</Button>
          <Button variant="outlined" onPress={() => setStatus('Long label pressed.')}>
            A longer action label to check wrapping with larger text
          </Button>
          <View style={styles.row}>
            <IconButton accessibilityLabel="Add sample" variant="primary" onPress={() => setStatus('Add icon pressed.')}
              icon={({ color, size }) => <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8}>
                <Path d="M5 12h14M12 5v14" strokeLinecap="round" />
              </Svg>} />
            <IconButton accessibilityLabel="Unavailable sample action" disabled icon={({ color, size }) => (
              <Svg width={size} height={size} viewBox="0 0 24 24" stroke={color} strokeWidth={1.8}>
                <Path d="M5 12h14M12 5v14" />
              </Svg>
            )} />
          </View>

          <Text accessibilityRole="header" style={styles.heading}>Text fields</Text>
          <TextField label="Preferred name" value={name} onChangeText={setName} helperText="Sample only. Your profile stays unchanged." />
          <TextField label="Email" value={email} onChangeText={setEmail} errorText={error}
            helperText="Press Check email to try validation." keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />
          <Button variant="outlined" onPress={() => {
            const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
            setError(valid ? undefined : 'Enter a valid email address.');
            setStatus(valid ? 'Sample email looks valid.' : 'Check the email field. Your text has been kept.');
          }}>Check email</Button>
          <TextField label="Error example" value="unfinished@" errorText="Enter a valid email address." readOnly />
          <TextField label="Disabled field" value="Preserved value" disabled />
          <TextField label="Read-only field" value="You can focus this field" readOnly />
          <Text style={styles.secondary}>Try Android’s larger font setting and TalkBack to check wrapping and labels.</Text>

          <Text accessibilityRole="header" style={styles.heading}>Settings rows</Text>
          <View>
            <SettingsRow kind="navigation" label="Appearance" value={preference[0].toUpperCase() + preference.slice(1)}
              description="Choose the preview’s theme." onPress={() => setAppearanceOpen(value => !value)} />
            {appearanceOpen && <View style={styles.row}>
              {(['light', 'dark', 'system'] as ThemePreference[]).map(mode => (
                <Button key={mode} variant={preference === mode ? 'primary' : 'outlined'} onPress={() => {
                  setPreference(mode); setAppearanceOpen(false);
                }}>{mode[0].toUpperCase() + mode.slice(1)}</Button>
              ))}
            </View>}
            <SettingsRow kind="toggle" label="Reminders" description="Sample only. No notifications will be scheduled."
              value={reminders} onValueChange={setReminders} />
            <SettingsRow kind="toggle" label="Unavailable setting" description="Disabled example, shown on." value disabled onValueChange={() => {}} />
            <SettingsRow kind="navigation" label="Unavailable destination" value="Not available" disabled onPress={() => {}} />
            <SettingsRow kind="info" label="Version" value="Design preview" />
            <SettingsRow kind="info" label="A longer setting label to check larger text sizes"
              description="Labels and descriptions can wrap." value="A longer setting value" />
          </View>
          <Text style={styles.secondary} accessibilityLiveRegion="polite">Sample reminders: {reminders ? 'on' : 'off'}</Text>
          <Text accessibilityRole="header" style={styles.heading}>Standalone switches</Text>
          <View style={styles.row}>
            <Switch accessibilityLabel="Standalone sample" value={standaloneSwitch} onValueChange={setStandaloneSwitch} />
            <Switch accessibilityLabel="Disabled off sample" value={false} onValueChange={() => {}} disabled />
            <Switch accessibilityLabel="Disabled on sample" value onValueChange={() => {}} disabled />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.canvas },
  content: { padding: theme.spacing.xl, gap: theme.spacing.lg, paddingBottom: theme.spacing.xxxl },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: theme.spacing.md },
  title: { ...theme.typography.title, color: theme.colors.text, flexShrink: 1 },
  heading: { ...theme.typography.heading, color: theme.colors.text, marginTop: theme.spacing.lg },
  secondary: { ...theme.typography.secondary, color: theme.colors.textMuted },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.md },
  art: { height: 190, borderRadius: theme.radii.dialog, alignItems: 'center', justifyContent: 'center' },
});
