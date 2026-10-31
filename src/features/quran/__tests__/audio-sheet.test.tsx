import type { ReactNode } from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { Pressable, Text } from 'react-native';
import { ALL_READERS } from '@/core/config';
import { AudioSheet } from '../components/audio-sheet';
import type { AyahAudioController } from '../use-ayah-audio';

/**
 * The audio panel's contract.
 *
 * `@expo/ui` swaps native SwiftUI/Compose controls for web/JS stand-ins, so the
 * mock exposes each control as a pressable that reports a value. That keeps the
 * assertions about *which callback fires with what*, not about native pixels.
 */
function MockHost({ children }: { children?: ReactNode }) {
  return <>{children}</>;
}

function MockSlider({
  onValueChange,
  testID,
}: {
  value: number;
  onValueChange: (value: number) => void;
  testID?: string;
}) {
  return <Pressable testID={testID} onPress={() => onValueChange(42)} />;
}

function MockSwitch({
  value,
  onValueChange,
  testID,
}: {
  value: boolean;
  onValueChange: (value: boolean) => void;
  label?: string;
  testID?: string;
}) {
  return <Pressable testID={testID} onPress={() => onValueChange(!value)} />;
}

function MockPicker({ children }: { children?: ReactNode }) {
  return <>{children}</>;
}
function MockPickerItem({ label }: { label: string }) {
  return <Text>{label}</Text>;
}
MockPicker.Item = MockPickerItem;

function MockBottomSheet({
  isPresented,
  children,
}: {
  isPresented?: boolean;
  children?: ReactNode;
}) {
  return isPresented ? <>{children}</> : null;
}

jest.mock('@expo/ui', () => ({
  BottomSheet: MockBottomSheet,
  Host: MockHost,
  Column: MockHost,
  Slider: MockSlider,
  Switch: MockSwitch,
  Picker: MockPicker,
}));

const SELECTED = { surah: 2, ayah: 255, absoluteNumber: 262 };

function controller(
  overrides: Partial<AyahAudioController> = {},
): AyahAudioController {
  return {
    playing: false,
    buffering: false,
    isLoaded: true,
    currentTime: 12,
    duration: 60,
    error: null,
    toggle: jest.fn(),
    seekTo: jest.fn(),
    retry: jest.fn(),
    ...overrides,
  };
}

function renderSheet(
  overrides: Partial<Parameters<typeof AudioSheet>[0]> = {},
) {
  const props: Parameters<typeof AudioSheet>[0] = {
    isPresented: true,
    selected: SELECTED,
    surahName: 'Al-Baqarah',
    reciters: ALL_READERS.slice(0, 2),
    reciterId: ALL_READERS[0].identifier,
    autoRead: false,
    wrap: false,
    audio: controller(),
    canStepPrevious: true,
    canStepNext: true,
    onDismiss: jest.fn(),
    onReciterChange: jest.fn(),
    onAutoReadChange: jest.fn(),
    onWrapChange: jest.fn(),
    onPrevious: jest.fn(),
    onNext: jest.fn(),
    ...overrides,
  };

  return { props, view: render(<AudioSheet {...props} />) };
}

describe('AudioSheet', () => {
  it('asks for a selection when no ayah is selected', async () => {
    const { view } = renderSheet({ selected: null });

    await view;

    expect(screen.getByTestId('audio-empty')).toBeTruthy();
    expect(screen.queryByTestId('audio-toggle')).toBeNull();
  });

  it('shows the selected ayah and drives play, pause and ayah steps', async () => {
    const audio = controller();
    const { props, view } = renderSheet({ audio });

    await view;

    expect(screen.getByTestId('audio-identity').props.children).toContain(
      'Al-Baqarah',
    );

    await fireEvent.press(screen.getByTestId('audio-toggle'));
    expect(audio.toggle).toHaveBeenCalledTimes(1);

    await fireEvent.press(screen.getByTestId('audio-prev'));
    await fireEvent.press(screen.getByTestId('audio-next'));

    expect(props.onPrevious).toHaveBeenCalledTimes(1);
    expect(props.onNext).toHaveBeenCalledTimes(1);
  });

  it('disables the steps at the boundaries instead of hiding them', async () => {
    const { props, view } = renderSheet({
      canStepPrevious: false,
      canStepNext: false,
    });

    await view;

    expect(
      screen.getByTestId('audio-prev').props.accessibilityState,
    ).toMatchObject({ disabled: true });
    expect(
      screen.getByTestId('audio-next').props.accessibilityState,
    ).toMatchObject({ disabled: true });

    await fireEvent.press(screen.getByTestId('audio-prev'));
    await fireEvent.press(screen.getByTestId('audio-next'));

    expect(props.onPrevious).not.toHaveBeenCalled();
    expect(props.onNext).not.toHaveBeenCalled();
  });

  it('seeks, changes reciter and toggles auto-read and wrap', async () => {
    const audio = controller();
    const { props, view } = renderSheet({ audio });

    await view;

    await fireEvent.press(screen.getByTestId('audio-seek'));
    expect(audio.seekTo).toHaveBeenCalledWith(42);

    await fireEvent.press(screen.getByTestId('audio-auto-read'));
    expect(props.onAutoReadChange).toHaveBeenCalledWith(true);

    await fireEvent.press(screen.getByTestId('audio-wrap'));
    expect(props.onWrapChange).toHaveBeenCalledWith(true);

    expect(props.onReciterChange).not.toHaveBeenCalled();
  });

  it('offers a retry instead of a silent failure', async () => {
    const audio = controller({ error: 'offline', isLoaded: false });
    const { view } = renderSheet({ audio });

    await view;

    expect(screen.getByTestId('audio-error')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('audio-retry'));

    expect(audio.retry).toHaveBeenCalledTimes(1);
  });

  it('renders nothing while closed', async () => {
    const { view } = renderSheet({ isPresented: false });

    await view;

    expect(screen.queryByTestId('audio-identity')).toBeNull();
  });
});
