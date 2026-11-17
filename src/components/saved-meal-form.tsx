import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { SavedMealEdits } from '@/components/saved-meal-detail';
import { TextField } from '@/components/ui/text-field';
import { Font, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { parseNutritionLabel, readProductName, type LabelField } from '@/lib/nutrition-label';
import { recognizeText, textRecognitionAvailable } from '@/lib/text-recognition';

const toInt = (text: string) => Math.max(0, Math.round(Number(text) || 0));

const LABEL_FIELDS: LabelField[] = ['calories', 'protein', 'carbs', 'fats'];

function listWords(words: string[]) {
  return words.length <= 1 ? words.join('') : `${words.slice(0, -1).join(', ')} and ${words[words.length - 1]}`;
}

/** Bottom-sheet form to create a new saved-meal template (name, macros, optional photo). */
export function SavedMealFormModal({ visible, busy, onCreate, onClose }: {
  visible: boolean;
  busy?: boolean;
  onCreate: (meal: SavedMealEdits) => void;
  onClose: () => void;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const [name, setName] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fats, setFats] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanNote, setScanNote] = useState<string | null>(null);

  // Clear the form each time it opens (adjust-state-during-render on the visible transition).
  const [wasVisible, setWasVisible] = useState(false);
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) {
      setName('');
      setCalories('');
      setProtein('');
      setCarbs('');
      setFats('');
      setPhotoUri(null);
      setScanning(false);
      setScanNote(null);
    }
  }

  function chooseLabelSource() {
    if (!textRecognitionAvailable) {
      Alert.alert(
        'Update the app to scan labels',
        'Label scanning needs the latest build of GymTracker (it is not available in Expo Go). Enter the values by hand for now.',
      );
      return;
    }
    Alert.alert('Scan nutrition label', 'Take a clear, straight-on photo of the Nutrition Facts panel.', [
      { text: 'Take photo', onPress: () => scanLabel('camera') },
      { text: 'Choose photo', onPress: () => scanLabel('library') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  async function scanLabel(from: 'camera' | 'library') {
    // Below 1 so Android re-encodes the pick into a standard JPEG/PNG (at 1 it copies the original bytes).
    const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.9 };
    try {
      let picked: ImagePicker.ImagePickerResult;
      if (from === 'camera') {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          Alert.alert('Camera access needed', 'Allow camera access in Settings to scan labels, or choose a photo instead.');
          return;
        }
        picked = await ImagePicker.launchCameraAsync(options);
      } else {
        picked = await ImagePicker.launchImageLibraryAsync(options);
      }
      if (picked.canceled) return;

      setScanning(true);
      setScanNote(null);
      const text = await recognizeText(picked.assets[0].uri);
      const values = parseNutritionLabel(text);
      const productName = readProductName(text);
      const found = LABEL_FIELDS.filter((field) => values[field] !== undefined);
      // Only fill the name when the field is empty, so a name the user typed is never replaced.
      const fillName = !!productName && !name.trim();
      if (found.length === 0 && !fillName) {
        setScanNote("Couldn't read any values from that photo. Try again closer, in good light, with the label flat.");
        return;
      }
      if (fillName) setName(productName);
      if (values.calories !== undefined) setCalories(String(values.calories));
      if (values.protein !== undefined) setProtein(String(values.protein));
      if (values.carbs !== undefined) setCarbs(String(values.carbs));
      if (values.fats !== undefined) setFats(String(values.fats));
      const missing = LABEL_FIELDS.filter((field) => !found.includes(field));
      const filled = [...(fillName ? ['meal name'] : []), ...found];
      setScanNote(
        `Filled ${listWords(filled)}${found.length ? ' for one serving' : ''}. Check them before saving.` +
          (missing.length ? ` Couldn't find ${listWords(missing)}.` : ''),
      );
    } catch (err) {
      Alert.alert(
        'Could not scan label',
        `That photo couldn't be read. Try taking a new photo of the label instead.${
          err instanceof Error ? `\n\nDetails: ${err.message}` : ''
        }`,
      );
    } finally {
      setScanning(false);
    }
  }

  function pickPhoto() {
    Alert.alert('Meal photo', 'Add a photo of this meal.', [
      { text: 'Take photo', onPress: () => capture('camera') },
      { text: 'Choose photo', onPress: () => capture('library') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  async function capture(from: 'camera' | 'library') {
    try {
      if (from === 'camera') {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          Alert.alert('Camera access needed', 'Allow camera access in Settings, or choose a photo instead.');
          return;
        }
        const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.6 });
        if (!result.canceled) setPhotoUri(result.assets[0].uri);
      } else {
        const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.6 });
        if (!result.canceled) setPhotoUri(result.assets[0].uri);
      }
    } catch (err) {
      Alert.alert('Could not add photo', err instanceof Error ? err.message : 'Something went wrong.');
    }
  }

  function create() {
    if (!name.trim()) {
      Alert.alert('Missing name', 'Give the meal a name.');
      return;
    }
    onCreate({
      name: name.trim(),
      calories: toInt(calories),
      protein: toInt(protein),
      carbs: toInt(carbs),
      fats: toInt(fats),
      photo_url: photoUri,
    });
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={styles.backdrop} accessibilityRole="button" accessibilityLabel="Close" onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: theme.card, paddingBottom: insets.bottom + Spacing.three }]}>
          <View style={[styles.grabber, { backgroundColor: theme.border }]} />
          <Text accessibilityRole="header" style={[styles.title, { color: theme.text }]}>New saved meal</Text>

          {photoUri ? (
            <View>
              <Pressable accessibilityRole="button" accessibilityLabel="Change meal photo" onPress={pickPhoto}>
                <Image source={{ uri: photoUri }} style={styles.photo} contentFit="cover" />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Remove photo"
                hitSlop={8}
                onPress={() => setPhotoUri(null)}
                style={[styles.removePhoto, { backgroundColor: theme.inverse }]}>
                <Ionicons name="close" size={16} color={theme.onInverse} />
              </Pressable>
            </View>
          ) : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Add meal photo"
              onPress={pickPhoto}
              style={[styles.photoDrop, { borderColor: theme.textSecondary, backgroundColor: theme.backgroundElement }]}>
              <Ionicons name="camera-outline" size={20} color={theme.text} />
              <Text style={[styles.photoText, { color: theme.text }]}>Add a photo</Text>
            </Pressable>
          )}

          <TextField label="Meal name" placeholder="e.g. Chicken rice bowl" value={name} onChangeText={setName} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Scan nutrition label"
            accessibilityHint="Reads calories, protein, carbs and fats from a photo of the label"
            accessibilityState={{ busy: scanning, disabled: scanning }}
            disabled={scanning}
            onPress={chooseLabelSource}
            style={({ pressed }) => [styles.scan, { backgroundColor: theme.inverse, opacity: pressed ? 0.85 : 1 }]}>
            {scanning ? (
              <ActivityIndicator color={theme.onInverse} />
            ) : (
              <Ionicons name="scan-outline" size={20} color={theme.onInverse} />
            )}
            <Text style={[styles.actionText, { color: theme.onInverse }]}>
              {scanning ? 'Reading label…' : 'Scan nutrition label'}
            </Text>
          </Pressable>
          {scanNote ? (
            <Text accessibilityLiveRegion="polite" style={[styles.scanNote, { color: theme.textSecondary }]}>
              {scanNote}
            </Text>
          ) : null}
          <View style={styles.row}>
            <View style={styles.flex}>
              <TextField label="Calories" keyboardType="numeric" value={calories} onChangeText={setCalories} />
            </View>
            <View style={styles.flex}>
              <TextField label="Protein (g)" keyboardType="numeric" value={protein} onChangeText={setProtein} />
            </View>
          </View>
          <View style={styles.row}>
            <View style={styles.flex}>
              <TextField label="Carbs (g)" keyboardType="numeric" value={carbs} onChangeText={setCarbs} />
            </View>
            <View style={styles.flex}>
              <TextField label="Fats (g)" keyboardType="numeric" value={fats} onChangeText={setFats} />
            </View>
          </View>

          <View style={styles.row}>
            <Pressable
              accessibilityRole="button"
              disabled={busy}
              onPress={onClose}
              style={[styles.actionBtn, styles.flex, { backgroundColor: theme.backgroundElement }]}>
              <Text style={[styles.actionText, { color: theme.text }]}>Cancel</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ busy, disabled: busy }}
              disabled={busy}
              onPress={create}
              style={[styles.actionBtn, styles.flex, { backgroundColor: theme.inverse, opacity: busy ? 0.5 : 1 }]}>
              <Text style={[styles.actionText, { color: theme.onInverse }]}>{busy ? 'Saving…' : 'Create'}</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, justifyContent: 'flex-end' },
  flex: { flex: 1 },
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    gap: Spacing.two,
    width: '100%',
    maxWidth: 800,
    alignSelf: 'center',
  },
  grabber: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: Spacing.one },
  title: { fontSize: 20, fontFamily: Font.bold },
  photo: { width: '100%', height: 180, borderRadius: Radius.md },
  photoDrop: {
    height: 64,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  photoText: { fontSize: 14, fontFamily: Font.semibold },
  removePhoto: { position: 'absolute', top: 8, right: 8, width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', gap: 10 },
  actionBtn: { minHeight: 48, borderRadius: Radius.pill, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: Spacing.one },
  actionText: { fontSize: 15, fontFamily: Font.bold },
  scan: { minHeight: 48, borderRadius: Radius.pill, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: Spacing.three },
  scanNote: { fontSize: 13, fontFamily: Font.medium, lineHeight: 18 },
});
