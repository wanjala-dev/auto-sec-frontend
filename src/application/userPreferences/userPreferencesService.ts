import { normalizeUserPreferences } from '../../domain/userPreferences/userPreferences';
import { userPreferencesApi } from '../../infrastructure/userPreferences/userPreferencesApi';

export const fetchUserPreferences = async (userId: string | number) => {
  const response = await userPreferencesApi.getByUserId(userId);
  return normalizeUserPreferences(response?.data);
};

export const updateUserPreferencesByUserId = async (
  userId: string | number,
  payload: Record<string, unknown>
) => {
  const response = await userPreferencesApi.updateByUserId(userId, payload);
  return normalizeUserPreferences(response?.data);
};
