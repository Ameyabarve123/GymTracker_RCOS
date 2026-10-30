/**
 * Hand-written types that mirror the Supabase schema in
 * `supabase/migrations`. Keep these in sync with the SQL.
 * (You can later replace this with `supabase gen types typescript`.)
 */

export type MuscleGroup = 'push' | 'pull' | 'legs' | 'shoulders' | 'core' | 'arms' | 'other';
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface Profile {
  id: string;
  username: string;
  is_private: boolean;
  avatar_url: string | null;
  calorie_goal: number;
  protein_goal: number;
  carbs_goal: number;
  fats_goal: number;
  current_streak: number;
  longest_streak: number;
  last_active_date: string | null;
  created_at: string;
}

export interface DailyLog {
  id: string;
  user_id: string;
  log_date: string;
  created_at: string;
}

export interface Meal {
  id: string;
  daily_log_id: string;
  user_id: string;
  name: string;
  meal_type: MealType;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  photo_url: string | null;
  logged_at: string;
}

export interface SavedMeal {
  id: string;
  user_id: string;
  name: string;
  meal_type: MealType;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  created_at: string;
}

export interface Exercise {
  id: string;
  name: string;
  muscle_group: MuscleGroup;
  is_default: boolean;
  created_by: string | null;
  created_at: string;
}

export interface Workout {
  id: string;
  user_id: string;
  preset_id: string | null;
  name: string;
  workout_date: string;
  notes: string | null;
  created_at: string;
}

export interface WorkoutExercise {
  id: string;
  workout_id: string;
  exercise_id: string;
  order_index: number;
}

export interface ExerciseSet {
  id: string;
  workout_exercise_id: string;
  set_number: number;
  reps: number;
  weight: number;
  is_dropset: boolean;
  order_index: number;
}

export interface Preset {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
}

export interface PresetExercise {
  id: string;
  preset_id: string;
  exercise_id: string;
  order_index: number;
  target_sets: number;
  target_reps: number;
}

export interface Friendship {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: 'pending' | 'accepted';
  created_at: string;
}

export interface Group {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
}

export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  joined_at: string;
}

type Insertable<T, Optional extends keyof T> = Omit<T, Optional> & Partial<Pick<T, Optional>>;

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Insertable<
          Profile,
          | 'is_private'
          | 'avatar_url'
          | 'calorie_goal'
          | 'protein_goal'
          | 'carbs_goal'
          | 'fats_goal'
          | 'current_streak'
          | 'longest_streak'
          | 'last_active_date'
          | 'created_at'
        >;
        Update: Partial<Profile>;
      };
      daily_logs: {
        Row: DailyLog;
        Insert: Insertable<DailyLog, 'id' | 'created_at'>;
        Update: Partial<DailyLog>;
      };
      meals: {
        Row: Meal;
        Insert: Insertable<Meal, 'id' | 'logged_at' | 'photo_url'>;
        Update: Partial<Meal>;
      };
      saved_meals: {
        Row: SavedMeal;
        Insert: Insertable<SavedMeal, 'id' | 'created_at'>;
        Update: Partial<SavedMeal>;
      };
      exercises: {
        Row: Exercise;
        Insert: Insertable<Exercise, 'id' | 'is_default' | 'created_by' | 'created_at'>;
        Update: Partial<Exercise>;
      };
      workouts: {
        Row: Workout;
        Insert: Insertable<Workout, 'id' | 'preset_id' | 'notes' | 'created_at'>;
        Update: Partial<Workout>;
      };
      workout_exercises: {
        Row: WorkoutExercise;
        Insert: Insertable<WorkoutExercise, 'id' | 'order_index'>;
        Update: Partial<WorkoutExercise>;
      };
      exercise_sets: {
        Row: ExerciseSet;
        Insert: Insertable<ExerciseSet, 'id' | 'is_dropset' | 'order_index'>;
        Update: Partial<ExerciseSet>;
      };
      presets: {
        Row: Preset;
        Insert: Insertable<Preset, 'id' | 'created_at'>;
        Update: Partial<Preset>;
      };
      preset_exercises: {
        Row: PresetExercise;
        Insert: Insertable<PresetExercise, 'id' | 'order_index' | 'target_sets' | 'target_reps'>;
        Update: Partial<PresetExercise>;
      };
      friendships: {
        Row: Friendship;
        Insert: Insertable<Friendship, 'id' | 'status' | 'created_at'>;
        Update: Partial<Friendship>;
      };
      groups: {
        Row: Group;
        Insert: Insertable<Group, 'id' | 'created_at'>;
        Update: Partial<Group>;
      };
      group_members: {
        Row: GroupMember;
        Insert: Insertable<GroupMember, 'id' | 'joined_at'>;
        Update: Partial<GroupMember>;
      };
    };
    Views: Record<string, never>;
    Functions: {
      touch_streak: {
        Args: { p_date: string };
        Returns: undefined;
      };
    };
    Enums: Record<string, never>;
  };
}
