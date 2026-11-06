import { Modal, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type Confirmation = { title: string; message: string; confirmLabel: string; onConfirm: () => void };

/** Uses a modal because native Alert buttons are not available on web. */
export function ConfirmDialog({ confirmation, onClose }: { confirmation: Confirmation | null; onClose: () => void }) {
  const theme = useTheme();
  return (
    <Modal visible={!!confirmation} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Card style={styles.card}>
          <Text accessibilityRole="header" style={{ color: theme.text, fontSize: 20, fontWeight: '700' }}>{confirmation?.title}</Text>
          <Text style={{ color: theme.textSecondary }}>{confirmation?.message}</Text>
          <Button title="Keep editing" variant="secondary" onPress={onClose} />
          <Button title={confirmation?.confirmLabel ?? 'Discard'} variant="danger" onPress={() => { onClose(); confirmation?.onConfirm(); }} />
        </Card>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)', padding: Spacing.four },
  card: { width: '100%', maxWidth: 420, gap: Spacing.three },
});
