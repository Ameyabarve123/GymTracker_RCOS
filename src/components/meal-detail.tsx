import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TextField } from '@/components/ui/text-field';
import { Font, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Meal, MealType } from '@/types/database';

type Theme = ReturnType<typeof useTheme>;

export type MealEdits = { name: string; calories: number; protein: number; carbs: number; fats: number; photo_url: string | null };

const SECTIONS: { type: MealType; label: string }[] = [
  { type: 'breakfast', label: 'Breakfast' },
  { type: 'lunch', label: 'Lunch' },
  { type: 'dinner', label: 'Dinner' },
  { type: 'snack', label: 'Snack' },
];

const toInt = (text: string) => Math.max(0, Math.round(Number(text) || 0));

/**
 * Bottom-sheet details for a logged meal: shows all its data, lets you move it to a different
 * section, edit its name/macros/photo, view the photo full screen, or delete it.
 */
export function MealDetailModal({ meal, busy, onChangeSection, onSave, onDelete, onClose }: {
  meal: Meal | null;
  busy?: boolean;
  onChangeSection: (type: MealType) => void;
  onSave: (edits: MealEdits) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const [editing, setEditing] = useState(false);
  const [zoomed, setZoomed] = useState(false);
  const [name, setName] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fats, setFats] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  // Reset the form when a different meal opens — React's "adjust state during render" pattern,
  // keyed on id so a background refetch of the same meal doesn't wipe an in-progress edit.
  const [formId, setFormId] = useState<string | undefined>(undefined);
  if (meal && meal.id !== formId) {
    setFormId(meal.id);
    setEditing(false);
    setZoomed(false);
    setName(meal.name);
    setCalories(String(meal.calories));
    setProtein(String(meal.protein));
    setCarbs(String(meal.carbs));
    setFats(String(meal.fats));
    setPhotoUri(meal.photo_url);
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

  function save() {
    if (!name.trim()) {
      Alert.alert('Missing name', 'Give the meal a name.');
      return;
    }
    onSave({
      name: name.trim(),
      calories: toInt(calories),
      protein: toInt(protein),
      carbs: toInt(carbs),
      fats: toInt(fats),
      photo_url: photoUri,
    });
  }

  return (
    <Modal visible={!!meal} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable
          style={styles.backdrop}
          accessibilityRole="button"
          accessibilityLabel="Close meal details"
          onPress={onClose}
        />
        {meal ? (
          <View style={[styles.sheet, { backgroundColor: theme.card, paddingBottom: insets.bottom + Spacing.three }]}>
            <View style={[styles.grabber, { backgroundColor: theme.border }]} />

            {editing ? (
              <>
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
                <TextField label="Meal name" value={name} onChangeText={setName} />
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
                    onPress={() => setEditing(false)}
                    style={[styles.actionBtn, styles.flex, { backgroundColor: theme.backgroundElement }]}>
                    <Text style={[styles.actionText, { color: theme.text }]}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ busy, disabled: busy }}
                    disabled={busy}
                    onPress={save}
                    style={[styles.actionBtn, styles.flex, { backgroundColor: theme.inverse, opacity: busy ? 0.5 : 1 }]}>
                    <Text style={[styles.actionText, { color: theme.onInverse }]}>{busy ? 'Saving…' : 'Save'}</Text>
                  </Pressable>
                </View>
              </>
            ) : (
              <>
                {meal.photo_url ? (
                  <Pressable accessibilityRole="button" accessibilityLabel="View photo full screen" onPress={() => setZoomed(true)}>
                    <Image source={{ uri: meal.photo_url }} style={styles.photo} contentFit="cover" />
                  </Pressable>
                ) : null}

                <Text accessibilityRole="header" style={[styles.name, { color: theme.text }]}>{meal.name}</Text>
                <Text style={[styles.time, { color: theme.textSecondary }]}>
                  Logged {format(new Date(meal.logged_at), 'h:mm a · d MMM yyyy')}
                </Text>

                <View style={styles.macroRow}>
                  <Stat label="Calories" value={meal.calories} unit="kcal" theme={theme} />
                  <Stat label="Protein" value={meal.protein} unit="g" theme={theme} />
                  <Stat label="Carbs" value={meal.carbs} unit="g" theme={theme} />
                  <Stat label="Fats" value={meal.fats} unit="g" theme={theme} />
                </View>

                <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Section</Text>
                <View style={styles.sections} accessibilityRole="radiogroup">
                  {SECTIONS.map(({ type, label }) => {
                    const active = meal.meal_type === type;
                    return (
                      <Pressable
                        key={type}
                        accessibilityRole="radio"
                        accessibilityState={{ selected: active, disabled: busy }}
                        disabled={busy}
                        onPress={() => !active && onChangeSection(type)}
                        style={[styles.section, { backgroundColor: active ? theme.inverse : theme.backgroundElement }]}>
                        <Text style={[styles.sectionText, { color: active ? theme.onInverse : theme.text }]}>{label}</Text>
                      </Pressable>
                    );
                  })}
                </View>

                <View style={styles.row}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Edit ${meal.name}`}
                    onPress={() => setEditing(true)}
                    style={[styles.actionBtn, styles.flex, { backgroundColor: theme.backgroundElement }]}>
                    <Ionicons name="create-outline" size={18} color={theme.text} />
                    <Text style={[styles.actionText, { color: theme.text }]}>Edit</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Delete ${meal.name}`}
                    onPress={onDelete}
                    style={[styles.actionBtn, styles.flex, { backgroundColor: theme.backgroundElement }]}>
                    <Ionicons name="trash-outline" size={18} color={theme.danger} />
                    <Text style={[styles.actionText, { color: theme.danger }]}>Delete</Text>
                  </Pressable>
                </View>
              </>
            )}
          </View>
        ) : null}

        {zoomed && meal?.photo_url ? (
          <Pressable
            style={styles.zoomOverlay}
            accessibilityRole="button"
            accessibilityLabel="Close full-screen photo"
            onPress={() => setZoomed(false)}>
            <Image source={{ uri: meal.photo_url }} style={styles.zoomImage} contentFit="contain" />
          </Pressable>
        ) : null}
      </KeyboardAvoidingView>
    </Modal>
  );
}

function Stat({ label, value, unit, theme }: { label: string; value: number; unit: string; theme: Theme }) {
  return (
    <View style={styles.stat}>
      <Text numberOfLines={1} adjustsFontSizeToFit style={[styles.statValue, { color: theme.text }]}>
        {value}
        <Text style={[styles.statUnit, { color: theme.textSecondary }]}> {unit}</Text>
      </Text>
      <Text style={[styles.statLabel, { color: theme.textSecondary }]}>{label}</Text>
    </View>
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
  name: { fontSize: 22, fontFamily: Font.bold },
  time: { fontSize: 13, fontFamily: Font.medium },
  row: { flexDirection: 'row', gap: 10 },
  macroRow: { flexDirection: 'row', gap: Spacing.two, marginTop: Spacing.one },
  stat: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: Radius.sm },
  statValue: { fontSize: 20, fontFamily: Font.bold },
  statUnit: { fontSize: 12, fontFamily: Font.medium },
  statLabel: { fontSize: 12, fontFamily: Font.medium, marginTop: 2 },
  sectionLabel: { fontSize: 13, fontFamily: Font.semibold, marginTop: Spacing.one },
  sections: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  section: { minHeight: 42, flexGrow: 1, paddingHorizontal: 14, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  sectionText: { fontSize: 14, fontFamily: Font.semibold },
  actionBtn: { minHeight: 48, borderRadius: Radius.pill, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: Spacing.one },
  actionText: { fontSize: 15, fontFamily: Font.bold },
  zoomOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.92)', alignItems: 'center', justifyContent: 'center' },
  zoomImage: { width: '100%', height: '100%' },
});
