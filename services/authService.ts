
import { Preferences } from '@capacitor/preferences';
import { UserModel, FirestoreData } from '../types';

const USER_STORAGE_KEY = 'studya_user';
const DEV_MODE_KEY = 'studya_dev_mode';

/**
 * Service to handle Authentication and Local Persistence operations.
 * Uses @capacitor/preferences for native storage.
 */
class AuthService {
  
  // Converts UserModel to Storage compatible object
  private toStorage(user: UserModel): FirestoreData {
    return {
      uid: user.uid,
      name: user.name,
      avatar_url: user.avatarUrl,
      grade: user.grade,
      target_exams: user.targetExams,
      target_uni: user.targetUni || null,
      target_dept: user.targetDept || null,
      is_target_undecided: user.isTargetUndecided || false,
      monthly_target_hours: user.monthlyTargetHours,
      target_period: user.targetPeriod || 'weekly',
      target_type: user.targetType || 'time',
      target_goal: user.targetGoal || 15,
      target_hours: user.targetHours || 15, // Legacy
      name_changes_remaining: user.nameChangesRemaining,
      showcase_badge_ids: user.showcaseBadgeIds || [],
      created_at: new Date().toISOString(),
    };
  }

  // Converts Storage data back to UserModel
  private fromStorage(data: FirestoreData): UserModel {
    return {
      uid: data.uid || 'unknown',
      name: data.name || '',
      avatarUrl: data.avatar_url || null,
      grade: data.grade || 12,
      targetExams: data.target_exams || [],
      targetUni: data.target_uni || undefined,
      targetDept: data.target_dept || undefined,
      isTargetUndecided: data.is_target_undecided || false,
      monthlyTargetHours: data.monthly_target_hours || 40,
      targetPeriod: data.target_period || 'weekly',
      targetType: data.target_type || 'time',
      targetGoal: data.target_goal || data.target_hours || 15,
      targetHours: data.target_hours || 15,
      nameChangesRemaining: data.name_changes_remaining !== undefined ? data.name_changes_remaining : 3,
      showcaseBadgeIds: data.showcase_badge_ids || [],
    };
  }

  /**
   * Loads the user from device storage.
   * Returns null if no user is found.
   */
  async loadUser(): Promise<UserModel | null> {
    const { value } = await Preferences.get({ key: USER_STORAGE_KEY });
    if (!value) return null;
    
    try {
      const parsed = JSON.parse(value);
      return this.fromStorage(parsed);
    } catch (e) {
      console.error("Failed to parse user data", e);
      return null;
    }
  }

  /**
   * Saves user data to device storage.
   */
  async saveUser(user: UserModel): Promise<void> {
    const data = this.toStorage(user);
    await Preferences.set({
      key: USER_STORAGE_KEY,
      value: JSON.stringify(data)
    });
  }

  /**
   * Creates a new user with a random ID and saves it.
   */
  async createUser(data: Partial<UserModel>): Promise<UserModel> {
    const uid = `user_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const completeUser: UserModel = {
      uid,
      name: data.name || '',
      avatarUrl: data.avatarUrl || null,
      grade: data.grade || 12,
      targetExams: data.targetExams || [],
      targetUni: data.targetUni,
      targetDept: data.targetDept,
      isTargetUndecided: data.isTargetUndecided || false,
      monthlyTargetHours: data.monthlyTargetHours || 40,
      targetPeriod: 'weekly',
      targetType: 'time',
      targetGoal: 15,
      targetHours: 15,
      nameChangesRemaining: 3,
      showcaseBadgeIds: [],
    };
    
    await this.saveUser(completeUser);
    return completeUser;
  }

  // --- Dev Mode Handlers ---

  async getDevMode(): Promise<boolean> {
    const { value } = await Preferences.get({ key: DEV_MODE_KEY });
    return value === 'true';
  }

  async setDevMode(isEnabled: boolean): Promise<void> {
    await Preferences.set({
      key: DEV_MODE_KEY,
      value: isEnabled ? 'true' : 'false'
    });
  }

  // --- Mock Auth Methods (Deprecated/Unused but kept for interface compatibility) ---
  async createUserWithEmailAndPassword(email: string, password: string): Promise<string> {
    return "mock-uid";
  }
  async saveUserDataToFirestore(user: UserModel): Promise<void> {
    await this.saveUser(user);
  }
}

export const authService = new AuthService();
