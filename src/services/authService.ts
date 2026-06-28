import { pb, COLLECTIONS } from '../lib/pocketbase';
import type { AuthUser } from '../types';

export const authService = {
  async login(email: string, password: string): Promise<AuthUser> {
    const result = await pb
      .collection(COLLECTIONS.USERS)
      .authWithPassword<AuthUser>(email, password);
    return result.record;
  },

  logout(): void {
    pb.authStore.clear();
  },

  getCurrentUser(): AuthUser | null {
    if (!pb.authStore.isValid) return null;
    return pb.authStore.record as unknown as AuthUser;
  },

  isAuthenticated(): boolean {
    return pb.authStore.isValid;
  },

  onChange(callback: (user: AuthUser | null) => void): () => void {
    return pb.authStore.onChange(() => {
      callback(authService.getCurrentUser());
    });
  },

  async refreshAuth(): Promise<AuthUser | null> {
    try {
      await pb.collection(COLLECTIONS.USERS).authRefresh();
      return authService.getCurrentUser();
    } catch {
      pb.authStore.clear();
      return null;
    }
  },
};
