import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { TextField } from '@/components/ui/text-field';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAddMeal, useRecentMeals, useSavedMeals } from '@/hooks/use-nutrition';
import { toDateKey } from '@/lib/date';
import type { MealType } from '@/types/database';

const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

export default function AddMealScreen() {
  const theme = useTheme();
  const router = useRouter();
  const today = toDateKey();

  const addMeal = useAddMeal(today);
  const recent = useRecentMeals();
  const saved = useSavedMeals();

  const [name, setName] = useState('');
  const [mealType, setMealType] = useState<MealType>('breakfast');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fats, setFats] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [saveTemplate, setSaveTemplate] = useState(false);

  function fill(meal: {
    name: string;
    meal_type: MealType;
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
  }) {
    setName(meal.name);
    setMealType(meal.meal_type);
    setCalories(String(meal.calories));
    setProtein(String(meal.protein));
    setCarbs(String(meal.carbs));
    setFats(String(meal.fats));
  }

  async function pickPhoto() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.6,
    });
    if (!result.canceled) setPhotoUri(result.assets[0].uri);
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

  const quickFills = [
    ...(recent.data ?? []).map((m) => ({ ...m, _source: 'recent' as const })),
    ...(saved.data ?? []).map((m) => ({ ...m, _source: 'saved' as const })),
  ];

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={{ backgroundColor: theme.background }}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled">
        <TextField label="Meal name" placeholder="e.g. Chicken & rice" value={name} onChangeText={setName} />

        <View style={styles.field}>
          <Text style={[styles.label, { color: theme.textSecondary }]}>Meal type</Text>
          <View style={styles.segment}>
            {MEAL_TYPES.map((type) => {
              const active = type === mealType;
              return (
                <Pressable
                  key={type}
                  onPress={() => setMealType(type)}
                  style={[
                    styles.segmentItem,
                    {
                      backgroundColor: active ? theme.tint : theme.backgroundElement,
                    },
                  ]}>
                  <Text
                    style={[
                      styles.segmentText,
                      { color: active ? '#fff' : theme.textSecondary },
                    ]}>
                    {type}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.row}>
          <View style={styles.flex}>
            <TextField
              label="Calories"
              placeholder="0"
              keyboardType="numeric"
              value={calories}
              onChangeText={setCalories}
            />
          </View>
          <View style={styles.flex}>
            <TextField
              label="Protein (g)"
              placeholder="0"
              keyboardType="numeric"
              value={protein}
              onChangeText={setProtein}
            />
          </View>
        </View>
        <View style={styles.row}>
          <View style={styles.flex}>
            <TextField
              label="Carbs (g)"
              placeholder="0"
              keyboardType="numeric"
              value={carbs}
              onChangeText={setCarbs}
            />
          </View>
          <View style={styles.flex}>
            <TextField
              label="Fats (g)"
              placeholder="0"
              keyboardType="numeric"
              value={fats}
              onChangeText={setFats}
            />
          </View>
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: theme.textSecondary }]}>Photo (optional)</Text>
          <Pressable onPress={pickPhoto}>
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={styles.photo} contentFit="cover" />
            ) : (
              <Card style={styles.photoPlaceholder}>
                <Ionicons name="camera-outline" size={24} color={theme.textSecondary} />
                <Text style={{ color: theme.textSecondary }}>Attach a meal photo</Text>
              </Card>
            )}
          </Pressable>
        </View>

        <Pressable style={styles.toggleRow} onPress={() => setSaveTemplate((v) => !v)}>
          <Ionicons
            name={saveTemplate ? 'checkbox' : 'square-outline'}
            size={22}
            color={saveTemplate ? theme.tint : theme.textSecondary}
          />
          <Text style={{ color: theme.text }}>Save as a reusable meal</Text>
        </Pressable>

        {quickFills.length > 0 ? (
          <View style={styles.field}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>Quick add</Text>
            <View style={styles.chips}>
              {quickFills.slice(0, 12).map((m) => (
                <Pressable
                  key={`${m._source}-${m.id}`}
                  onPress={() => fill(m)}
                  style={[styles.chip, { backgroundColor: theme.backgroundElement }]}>
                  <Ionicons
                    name={m._source === 'saved' ? 'bookmark' : 'time-outline'}
                    size={14}
                    color={theme.textSecondary}
                  />
                  <Text style={[styles.chipText, { color: theme.text }]}>{m.name}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}

        <Button title="Save Meal" loading={addMeal.isPending} onPress={handleSave} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: Spacing.three, gap: Spacing.three, paddingBottom: Spacing.six },
  field: { gap: Spacing.two },
  label: { fontSize: 13, fontWeight: '600' },
  row: { flexDirection: 'row', gap: Spacing.three },
  segment: { flexDirection: 'row', gap: Spacing.two, flexWrap: 'wrap' },
  segmentItem: { paddingVertical: Spacing.two, paddingHorizontal: Spacing.three, borderRadius: 10 },
  segmentText: { fontSize: 13, fontWeight: '600', textTransform: 'capitalize' },
  photo: { width: '100%', height: 180, borderRadius: 14 },
  photoPlaceholder: { alignItems: 'center', justifyContent: 'center', height: 100, flexDirection: 'row', gap: Spacing.two },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: 20,
  },
  chipText: { fontSize: 13, fontWeight: '600' },
});
