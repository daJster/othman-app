/**
 * Manual mock for `@expo/ui`.
 *
 * The real package renders platform host adapters (`ViewManagerAdapter_ExpoUI`)
 * that carry no readable text or press handlers under Jest, so a screen test
 * would only be able to assert testIDs. This mock mirrors the **universal** API
 * the app uses with ordinary React Native primitives:
 *
 *  - `Host` / `List` / `RNHostView` become `View`s;
 *  - `ListItem` becomes a `Pressable` (when it has `onPress`) with its headline,
 *    supporting text and the two slots rendered as children;
 *  - `Picker` renders its items as pressable options, so a test can select a
 *    role without simulating a native menu.
 *
 * The mock is deliberately behavioural, not visual: layout, styling and the
 * native list itself are verified on device. Keeping it small also means a
 * component that starts using a new `@expo/ui` export fails loudly here instead
 * of silently rendering nothing.
 */
const React = require('react');
const { Pressable, Text, View } = require('react-native');

const h = React.createElement;

/** Drop props the real component consumes but a `View` must not receive. */
function viewProps(props) {
  const {
    matchContents: _matchContents,
    colorScheme: _colorScheme,
    seedColor: _seedColor,
    ignoreSafeArea: _ignoreSafeArea,
    useViewportSizeMeasurement: _useViewportSizeMeasurement,
    onLayoutContent: _onLayoutContent,
    children,
    ...rest
  } = props;

  return { rest, children };
}

function Host(props) {
  const { rest, children } = viewProps(props);
  return h(View, rest, children);
}

function RNHostView(props) {
  const { rest, children } = viewProps(props);
  return h(View, rest, children);
}

function List(props) {
  const { rest, children } = viewProps(props);
  return h(View, rest, children);
}

function asNode(value) {
  if (value == null || typeof value === 'boolean') return null;
  if (typeof value === 'string' || typeof value === 'number') {
    return h(Text, null, value);
  }
  return value;
}

function ListItem(props) {
  const { children, leading, trailing, supportingText, onPress, testID } = props;

  const content = h(
    View,
    null,
    asNode(leading),
    h(
      View,
      null,
      asNode(children),
      supportingText != null ? asNode(supportingText) : null,
    ),
    asNode(trailing),
  );

  if (!onPress) return h(View, { testID }, content);

  return h(
    Pressable,
    {
      accessibilityRole: 'button',
      accessibilityState: { disabled: false },
      onPress,
      testID,
    },
    content,
  );
}

function Picker({ selectedValue, onValueChange, enabled = true, children, testID }) {
  const items = React.Children.toArray(children)
    .filter(React.isValidElement)
    .map((child) => child.props);

  const selected = items.find((item) => item.value === selectedValue);

  return h(
    View,
    { testID },
    h(Text, { testID: testID ? `${testID}:selected` : undefined }, selected?.label ?? ''),
    ...items.map((item) =>
      h(
        Pressable,
        {
          key: String(item.value),
          accessibilityRole: 'button',
          accessibilityState: { disabled: !enabled },
          disabled: !enabled,
          onPress: () => onValueChange(item.value),
          testID: testID ? `${testID}:${item.value}` : undefined,
        },
        h(Text, null, item.label),
      ),
    ),
  );
}

function PickerItem() {
  // Data-only marker in the real package; the parent extracts its props.
  return null;
}

Picker.Item = PickerItem;

/**
 * The real sheet is a platform modal: under Jest nothing is presented, so the
 * mock renders its children only while `isPresented` is true — enough to assert
 * "the detail sheet is open/closed".
 */
function BottomSheet({ isPresented, children, testID }) {
  if (!isPresented) return null;

  return h(View, { testID }, children);
}

module.exports = {
  __esModule: true,
  Host,
  RNHostView,
  List,
  ListItem,
  Picker,
  BottomSheet,
};
