import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { confirmDeleteSavedMeal } from '@/components/saved-meal-row';
import { Card } from '@/components/ui/card';
import { CircleButton, GradientHeader } from '@/components/ui/gradient-header';
import { TextField } from '@/components/ui/text-field';
import { Font, Radius, Spacing } from '@/constants/theme';
import { useAddMeal, useDeleteSavedMeal, useRecentMeals, useSavedMeals } from '@/hooks/use-nutrition';
import { useTheme } from '@/hooks/use-theme';
import { toDateKey } from '@/lib/date';
import { parseNutritionLabel, type LabelField } from '@/lib/nutrition-label';
import { recognizeText, textRecognitionAvailable } from '@/lib/text-recognition';
import type { MealType } from '@/types/database';

const LABEL_FIELDS: LabelField[] = ['calories', 'protein', 'carbs', 'fats'];

function listWords(words: string[]) {
  return words.length <= 1 ? words.join('') : `${words.slice(0, -1).join(', ')} and ${words[words.length - 1]}`;
}

const MEAL_TYPES: { type: MealType; label: string }[] = [
  { type: 'breakfast', label: 'Breakfast' },
  { type: 'lunch', label: 'Lunch' },
  { type: 'dinner', label: 'Dinner' },
  { type: 'snack', label: 'Snack' },
];

type QuickMeal = { id: string; name: string; meal_type: MealType; calories: number; protein: number; carbs: number; fats: number };

export default function AddMealScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  // A saved meal opened from Saved Meals arrives pre-filled through these params.
  const params = useLocalSearchParams<{ type?: string; name?: string; calories?: string; protein?: string; carbs?: string; fats?: string }>();
  const today = toDateKey();

  const addMeal = useAddMeal(today);
  const recent = useRecentMeals();
  const saved = useSavedMeals();
  const deleteSaved = useDeleteSavedMeal();

  const initialType = MEAL_TYPES.some((m) => m.type === params.type) ? (params.type as MealType) : 'breakfast';
  const [name, setName] = useState(params.name ?? '');
  const [mealType, setMealType] = useState<MealType>(initialType);
  const [calories, setCalories] = useState(params.calories ?? '');
  const [protein, setProtein] = useState(params.protein ?? '');
  const [carbs, setCarbs] = useState(params.carbs ?? '');
  const [fats, setFats] = useState(params.fats ?? '');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [saveTemplate, setSaveTemplate] = useState(false);
  const [source, setSource] = useState<'recent' | 'saved'>('recent');
  const [scanning, setScanning] = useState(false);
  const [scanNote, setScanNote] = useState<string | null>(null);

  function fill(meal: QuickMeal) {
    setName(meal.name);
    setMealType(meal.meal_type);
    setCalories(String(meal.calories));
    setProtein(String(meal.protein));
    setCarbs(String(meal.carbs));
    setFats(String(meal.fats));
  }

  function confirmDeleteSaved(meal: QuickMeal) {
    confirmDeleteSavedMeal(meal.name, () =>
      deleteSaved.mutate(meal.id, {
        onError: (err) => Alert.alert('Could not delete', err instanceof Error ? err.message : 'Something went wrong.'),
      }),
    );
  }

  async function pickPhoto() {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.6 });
    if (!result.canceled) setPhotoUri(result.assets[0].uri);
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
    // Below 1 so Android re-encodes the pick into a standard JPEG/PNG (at 1 it copies the original
    // bytes, e.g. HEIC, under a .jpeg name). 0.9 keeps label text sharp.
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
      const values = parseNutritionLabel(await recognizeText(picked.assets[0].uri));
      const found = LABEL_FIELDS.filter((field) => values[field] !== undefined);
      if (found.length === 0) {
        setScanNote("Couldn't read any values from that photo. Try again closer, in good light, with the label flat.");
        return;
      }
      if (values.calories !== undefined) setCalories(String(values.calories));
      if (values.protein !== undefined) setProtein(String(values.protein));
      if (values.carbs !== undefined) setCarbs(String(values.carbs));
      if (values.fats !== undefined) setFats(String(values.fats));
      const missing = LABEL_FIELDS.filter((field) => !found.includes(field));
      setScanNote(
        `Filled ${listWords(found)} for one serving. Check them before adding.` +
          (missing.length ? ` Couldn't find ${listWords(missing)}.` : ''),
      );
    } catch (err) {
      // Friendly first; the technical detail stays visible to help with bug reports.
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

  async function handleSave() {
    if (!name.trim()) {
      Alert.alert('Missing name', 'Give your meal a name.');
      return;
    }
    try {
      await addMeal.mutateAsync({
        name: name.trim(),
        meal_type: mealType,
        calories: Number(calories) || 0,
        protein: Number(protein) || 0,
        carbs: Number(carbs) || 0,
        fats: Number(fats) || 0,
        photo_url: photoUri,
        saveAsTemplate: saveTemplate,
      });
      router.back();
    } catch (err) {
      Alert.alert('Could not save', err instanceof Error ? err.message : 'Something went wrong.');
    }
  }

  const quick: QuickMeal[] = (source === 'recent' ? recent.data : saved.data) ?? [];
  const typeLabel = MEAL_TYPES.find((m) => m.type === mealType)?.label ?? 'Meal';

  return (
    <KeyboardAvoidingView style={[styles.flex, { backgroundColor: theme.background }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <GradientHeader
          title="Log a Meal"
          subtitle={format(new Date(), 'd MMM yyyy')}
          left={<CircleButton icon="close" accessibilityLabel="Close" onPress={() => router.back()} />}
          right={<View />}>
          <View style={styles.types} accessibilityRole="radiogroup">
            {MEAL_TYPES.map(({ type, label }) => {
              const active = type === mealType;
              return (
                <Pressable
                  key={type}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: active }}
                  onPress={() => setMealType(type)}
                  style={[styles.typeChip, { backgroundColor: active ? theme.inverse : theme.card }]}>
                  <Text style={[styles.typeText, { color: active ? theme.onInverse : theme.text }]}>{label}</Text>
                </Pressable>
              );
            })}
          </View>
        </GradientHeader>

        <View style={styles.body}>
          <Card style={styles.formCard}>
            <Pressable accessibilityRole="button" accessibilityLabel={photoUri ? 'Change meal photo' : 'Attach a meal photo'} onPress={pickPhoto}>
              {photoUri ? (
                <Image source={{ uri: photoUri }} style={styles.photo} contentFit="cover" />
              ) : (
                <View style={[styles.photoDrop, { borderColor: theme.textSecondary, backgroundColor: theme.backgroundElement }]}>
                  <Ionicons name="camera-outline" size={20} color={theme.text} />
                  <Text style={[styles.photoText, { color: theme.text }]}>Attach a photo</Text>
                </View>
              )}
            </Pressable>
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
              <Text style={[styles.scanText, { color: theme.onInverse }]}>
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
                <TextField label="Calories" placeholder="0" keyboardType="numeric" value={calories} onChangeText={setCalories} />
              </View>
              <View style={styles.flex}>
                <TextField label="Protein (g)" placeholder="0" keyboardType="numeric" value={protein} onChangeText={setProtein} />
              </View>
            </View>
            <View style={styles.row}>
              <View style={styles.flex}>
                <TextField label="Carbs (g)" placeholder="0" keyboardType="numeric" value={carbs} onChangeText={setCarbs} />
              </View>
              <View style={styles.flex}>
                <TextField label="Fats (g)" placeholder="0" keyboardType="numeric" value={fats} onChangeText={setFats} />
              </View>
            </View>
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: saveTemplate }}
              onPress={() => setSaveTemplate((v) => !v)}
              style={styles.check}>
              <Ionicons name={saveTemplate ? 'checkbox' : 'square-outline'} size={22} color={theme.text} />
              <Text style={[styles.checkText, { color: theme.text }]}>Save to my meals</Text>
            </Pressable>
          </Card>

          <Card style={styles.quickCard}>
            <View style={styles.between}>
              <Text accessibilityRole="header" style={[styles.quickTitle, { color: theme.text }]}>Quick add</Text>
              <View style={[styles.toggle, { backgroundColor: theme.backgroundElement }]} accessibilityRole="tablist">
                {(['recent', 'saved'] as const).map((key) => {
                  const active = source === key;
                  return (
                    <Pressable
                      key={key}
                      accessibilityRole="tab"
                      accessibilityState={{ selected: active }}
                      onPress={() => setSource(key)}
                      style={[styles.toggleItem, active && { backgroundColor: theme.inverse }]}>
                      <Text style={[styles.toggleText, { color: active ? theme.onInverse : theme.textSecondary }]}>
                        {key === 'recent' ? 'Recent' : 'Saved'}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
            {quick.length === 0 ? (
              <Text style={[styles.quickMeta, { color: theme.textSecondary }]}>
                {source === 'recent' ? 'Meals you log will show up here.' : 'Tick "Save to my meals" to keep a meal here.'}
              </Text>
            ) : (
              // Show every saved meal so each one can be managed; recent stays capped.
              (source === 'saved' ? quick : quick.slice(0, 8)).map((meal) => (
                <View key={`${source}-${meal.id}`} style={styles.quickRow}>
                  <View style={styles.flex}>
                    <Text style={[styles.quickName, { color: theme.text }]}>{meal.name}</Text>
                    <Text style={[styles.quickMeta, { color: theme.textSecondary }]}>
                      {meal.calories} kcal · P {meal.protein} · C {meal.carbs} · F {meal.fats}
                    </Text>
                  </View>
                  {source === 'saved' ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Delete saved meal ${meal.name}`}
                      accessibilityState={{ disabled: deleteSaved.isPending }}
                      disabled={deleteSaved.isPending}
                      hitSlop={6}
                      onPress={() => confirmDeleteSaved(meal)}
                      style={[styles.plus, { backgroundColor: theme.backgroundElement, opacity: deleteSaved.isPending ? 0.5 : 1 }]}>
                      <Ionicons name="trash-outline" size={17} color={theme.danger} />
                    </Pressable>
                  ) : null}
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Use ${meal.name}`}
                    onPress={() => fill(meal)}
                    style={[styles.plus, { backgroundColor: theme.inverse }]}>
                    <Ionicons name="add" size={18} color={theme.onInverse} />
                  </Pressable>
                </View>
              ))
            )}
          </Card>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.three }]}>
        <View style={[styles.adding, { backgroundColor: theme.inverse }]}>
          <Text style={[styles.addingLabel, { color: theme.onInverseSecondary }]}>Adding</Text>
          <Text style={[styles.addingValue, { color: theme.onInverse }]}>{(Number(calories) || 0).toLocaleString()} kcal</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ busy: addMeal.isPending, disabled: addMeal.isPending }}
          disabled={addMeal.isPending}
          onPress={handleSave}
          style={({ pressed }) => [styles.save, { backgroundColor: theme.accent, opacity: addMeal.isPending ? 0.5 : pressed ? 0.85 : 1 }]}>
          <Text style={[styles.saveText, { color: theme.onAccent }]}>
            {addMeal.isPending ? 'Saving…' : `Add to ${typeLabel}`}
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { paddingBottom: Spacing.four },
  body: { padding: Spacing.two, gap: Spacing.two, width: '100%', maxWidth: 800, alignSelf: 'center' },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  types: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6 },
  typeChip: { minHeight: 40, paddingHorizontal: 14, borderRadius: Radius.pill, justifyContent: 'center' },
  typeText: { fontSize: 14, fontFamily: Font.semibold },
  formCard: { gap: 12 },
  photoDrop: {
    height: 64,
    borderRadius: 18,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  photoText: { fontSize: 14, fontFamily: Font.semibold },
  photo: { width: '100%', height: 180, borderRadius: 18 },
  row: { flexDirection: 'row', gap: 10 },
  scan: {
    minHeight: 48,
    borderRadius: Radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: Spacing.three,
  },
  scanText: { fontSize: 15, fontFamily: Font.bold },
  scanNote: { fontSize: 13, fontFamily: Font.medium, lineHeight: 18 },
  check: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44 },
  checkText: { fontSize: 14, fontFamily: Font.semibold },
  quickCard: { gap: 10 },
  quickTitle: { fontSize: 17, fontFamily: Font.bold },
  toggle: { flexDirection: 'row', gap: 4, padding: 4, borderRadius: Radius.pill },
  toggleItem: { minHeight: 32, paddingHorizontal: 12, borderRadius: Radius.pill, justifyContent: 'center' },
  toggleText: { fontSize: 13, fontFamily: Font.bold },
  quickRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  quickName: { fontSize: 15, fontFamily: Font.semibold },
  quickMeta: { fontSize: 13, fontFamily: Font.medium },
  plus: { width: 40, height: 40, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  footer: { flexDirection: 'row', gap: Spacing.two, paddingHorizontal: Spacing.two, paddingTop: Spacing.two },
  adding: { flex: 1, borderRadius: 22, paddingHorizontal: Spacing.three, paddingVertical: 10, justifyContent: 'center' },
  addingLabel: { fontSize: 12, fontFamily: Font.medium },
  addingValue: { fontSize: 18, fontFamily: Font.semibold },
  save: { flex: 1.3, minHeight: 60, borderRadius: 22, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.two },
  saveText: { fontSize: 16, fontFamily: Font.extrabold, textAlign: 'center' },
});
