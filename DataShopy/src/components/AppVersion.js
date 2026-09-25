import React from 'react';
import { StyleSheet, Text } from 'react-native';
import * as Application from 'expo-application';
import Constants from 'expo-constants';
import { colors } from '../constants/theme';

// "v1.0.0 (12)": the version comes from app.json and the number in parentheses is the
// native build number, which EAS increments on every build (see eas.json autoIncrement),
// so it changes by itself with each new build.
export const getVersionLabel = () => {
  const version = Application.nativeApplicationVersion || Constants.expoConfig?.version || '';
  const build = Application.nativeBuildVersion;
  if (!version) return '';
  return build ? `v${version} (${build})` : `v${version}`;
};

export default function AppVersion() {
  const label = getVersionLabel();
  if (!label) return null;
  return <Text style={styles.text}>{label}</Text>;
}

const styles = StyleSheet.create({
  text: { textAlign: 'center', fontSize: 11, color: colors.textTertiary, paddingVertical: 10 },
});
