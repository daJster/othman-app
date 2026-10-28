import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { setLanguage } from '@/providers/language-provider';
import { LanguageToggle } from '@/ui/language-toggle';

/**
 * The toggle has one non-obvious behaviour: flipping to the other direction on
 * native cannot move `I18nManager`'s own controls, so it must say so. The alert
 * is the observable part of that contract.
 */
afterEach(async () => {
  await act(async () => {
    await setLanguage('en');
  });
});

describe('LanguageToggle', () => {
  it('renders both languages and marks the active one', async () => {
    await render(<LanguageToggle />);

    expect(screen.getByText('English')).toBeTruthy();
    expect(screen.getByText('العربية')).toBeTruthy();
    expect(
      screen.getByRole('radio', { name: 'English' }).props.accessibilityState,
    ).toMatchObject({ selected: true });
  });

  it('switches the language when an option is pressed', async () => {
    await render(<LanguageToggle />);

    await act(async () => {
      fireEvent.press(screen.getByText('العربية'));
    });

    expect(
      screen.getByRole('radio', { name: 'العربية' }).props.accessibilityState,
    ).toMatchObject({ selected: true });
  });

  it('prompts for a restart when the direction changes on native', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    await render(<LanguageToggle />);

    await act(async () => {
      fireEvent.press(screen.getByText('العربية'));
      // The alert is raised after `changeLanguage` resolves.
      await Promise.resolve();
    });

    expect(alert).toHaveBeenCalledWith(
      'Restart needed',
      expect.stringContaining('restarts'),
      expect.any(Array),
    );
  });
});
