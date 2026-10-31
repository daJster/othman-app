// Platform-resolved barrel: Metro picks `authService.web.ts` on web and
// `authService.ts` everywhere else. Consumers must import this file, never a
// concrete implementation.
export { authService } from './authService';
