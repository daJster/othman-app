// Platform-resolved barrel: Metro picks `authService.web.ts` on web and
// `authService.ts` everywhere else. Consumers must import this file, never a
// concrete implementation.
//
// `EXPO_PUBLIC_MOCK_BACKEND=1` swaps the Firebase implementation for the mock
// server client. Both satisfy `AuthService`, so the provider and every screen
// stay unchanged.
import { MOCK_BACKEND_ENABLED } from '@/platform/backend';
import { authService as firebaseAuthService } from './authService';
import { mockAuthService } from './authService.mock';
import type { AuthService } from './auth.types';

export const authService: AuthService = MOCK_BACKEND_ENABLED
  ? mockAuthService
  : firebaseAuthService;
