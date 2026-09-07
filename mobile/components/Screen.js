import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../theme';

// Shared full-bleed dark background, standing in for the web app's
// `linear-gradient(135deg, #0a1628, #0d2137)` (React Native has no CSS
// gradient without a native module, so we use the darker solid endpoint).
export default function Screen({ children, style, edges }) {
  return (
    <SafeAreaView style={styles.safe} edges={edges}>
      <View style={[styles.container, style]}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bgBottom,
  },
  container: {
    flex: 1,
    backgroundColor: colors.bgBottom,
  },
});
