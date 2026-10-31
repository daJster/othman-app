import { isPrivateAppPath } from '@/features/navigation/private-path';

describe('isPrivateAppPath', () => {
  it('matches the private tab roots', () => {
    expect(isPrivateAppPath('/meetings')).toBe(true);
    expect(isPrivateAppPath('/account')).toBe(true);
  });

  it('matches private subroutes', () => {
    expect(isPrivateAppPath('/account/edit')).toBe(true);
    expect(isPrivateAppPath('/account/progress')).toBe(true);
  });

  it('leaves public routes and lookalikes alone', () => {
    expect(isPrivateAppPath('/')).toBe(false);
    expect(isPrivateAppPath('/quran')).toBe(false);
    expect(isPrivateAppPath('/about')).toBe(false);
    expect(isPrivateAppPath('/auth/sign-in')).toBe(false);
    expect(isPrivateAppPath('/accounting')).toBe(false);
    expect(isPrivateAppPath('/meetings-archive')).toBe(false);
  });
});
