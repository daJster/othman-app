import { useId, useState } from 'react';
import { View, type LayoutChangeEvent, type ViewProps } from 'react-native';
import Animated, { FadeIn, ReduceMotion } from 'react-native-reanimated';
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  Line,
  Path,
  Stop,
} from 'react-native-svg';
import { useResolveClassNames } from 'uniwind';
import { cn } from '../cn';
import { Text } from '../text';
import { useReducedMotion } from '../motion';

/**
 * A small line chart for a short time series.
 *
 * This is a reading aid, not a dashboard widget: one series, no legend, no
 * hover tooltips. The last point is marked so "where the series ends" is
 * visible, and the axis labels are sampled (first / middle / last) rather than
 * printed in full, which is what keeps an eight-week series readable at 375 px.
 *
 * The plot is drawn with `react-native-svg`, so it renders identically on web,
 * iOS and Android. Colours come from the same tokens as the rest of the page;
 * the fill is a gradient of `primary` and the grid is a `border` hairline.
 */
export type LineChartPoint = {
  label: string;
  value: number;
  /** Optional spoken description for the point. */
  accessibilityLabel?: string;
};

export type LiveLinechartProps = Omit<ViewProps, 'children'> & {
  data: readonly LineChartPoint[];
  height?: number;
  /** Shown when every value is zero. */
  emptyLabel?: string;
  /** Spoken summary of the whole series. */
  accessibilityLabel?: string;
  testID?: string;
};

const PADDING_X = 10;
const PADDING_TOP = 14;
const PADDING_BOTTOM = 6;

export function LiveLinechart({
  data,
  height = 144,
  emptyLabel,
  accessibilityLabel,
  className,
  testID,
  ...props
}: LiveLinechartProps) {
  const [width, setWidth] = useState(0);
  const reduced = useReducedMotion();
  const gradientId = `chart-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const primary = useResolveClassNames('bg-primary').backgroundColor;
  const border = useResolveClassNames('bg-border').backgroundColor;
  const muted = useResolveClassNames('bg-muted-foreground').backgroundColor;
  const stroke = String(primary ?? 'currentColor');
  const grid = String(border ?? 'transparent');

  const onLayout = (event: LayoutChangeEvent) => {
    const next = Math.round(event.nativeEvent.layout.width);
    if (next !== width) setWidth(next);
  };

  const values = data.map((point) => point.value);
  const max = Math.max(1, ...values);
  const hasActivity = values.some((value) => value > 0);

  const innerWidth = Math.max(0, width - PADDING_X * 2);
  const innerHeight = Math.max(0, height - PADDING_TOP - PADDING_BOTTOM);

  const points = data.map((point, index) => ({
    x:
      data.length <= 1
        ? PADDING_X + innerWidth / 2
        : PADDING_X + (innerWidth * index) / (data.length - 1),
    y: PADDING_TOP + innerHeight * (1 - point.value / max),
  }));

  const line = buildLine(points);
  const area =
    points.length > 0
      ? `${line} L ${points[points.length - 1]?.x ?? PADDING_X} ${
          PADDING_TOP + innerHeight
        } L ${points[0]?.x ?? PADDING_X} ${PADDING_TOP + innerHeight} Z`
      : '';

  const sampled = sampleLabels(data);

  return (
    <View
      testID={testID}
      className={cn('w-full', className)}
      onLayout={onLayout}
      accessible
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
      {...props}
    >
      {width > 0 ? (
        <>
          <Animated.View
            entering={
              reduced
                ? undefined
                : FadeIn.duration(220).reduceMotion(ReduceMotion.System)
            }
          >
            <Svg width={width} height={height}>
              <Defs>
                <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor={stroke} stopOpacity={0.26} />
                  <Stop offset="1" stopColor={stroke} stopOpacity={0} />
                </LinearGradient>
              </Defs>

              {[0, 0.5, 1].map((fraction) => {
                const y = PADDING_TOP + innerHeight * fraction;

                return (
                  <Line
                    key={fraction}
                    x1={PADDING_X}
                    x2={width - PADDING_X}
                    y1={y}
                    y2={y}
                    stroke={grid}
                    strokeWidth={1}
                  />
                );
              })}

              {hasActivity && area ? (
                <Path d={area} fill={`url(#${gradientId})`} />
              ) : null}

              {line ? (
                <Path
                  d={line}
                  fill="none"
                  stroke={hasActivity ? stroke : String(muted ?? grid)}
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ) : null}

              {hasActivity && points.length > 0 ? (
                <>
                  <Circle
                    cx={points[points.length - 1]?.x}
                    cy={points[points.length - 1]?.y}
                    r={7}
                    fill={stroke}
                    opacity={0.18}
                  />
                  <Circle
                    cx={points[points.length - 1]?.x}
                    cy={points[points.length - 1]?.y}
                    r={3.5}
                    fill={stroke}
                  />
                </>
              ) : null}
            </Svg>
          </Animated.View>

          {!hasActivity && emptyLabel ? (
            <Text
              variant="caption"
              tone="muted"
              align="center"
              className="absolute inset-x-0 top-1/2 -mt-2"
            >
              {emptyLabel}
            </Text>
          ) : null}

          <View className="flex-row justify-between pt-1">
            {sampled.map((label, index) => (
              <Text
                key={`${label}-${index}`}
                variant="caption"
                tone="muted"
                align={index === 0 ? 'start' : index === 2 ? 'end' : 'center'}
                className="flex-1"
              >
                {label}
              </Text>
            ))}
          </View>
        </>
      ) : (
        <View style={{ height }} />
      )}
    </View>
  );
}

type Point = { x: number; y: number };

function buildLine(points: readonly Point[]): string {
  if (points.length === 0) return '';

  const first = points[0];
  if (!first || points.length === 1)
    return `M ${first?.x ?? 0} ${first?.y ?? 0}`;

  let path = `M ${first.x} ${first.y}`;

  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    if (!previous || !current) continue;

    const midX = (previous.x + current.x) / 2;
    path += ` C ${midX} ${previous.y} ${midX} ${current.y} ${current.x} ${current.y}`;
  }

  return path;
}

/** First, middle and last labels, so the axis never crowds the phone width. */
function sampleLabels(data: readonly LineChartPoint[]): string[] {
  if (data.length === 0) return ['', '', ''];

  const first = data[0]?.label ?? '';
  const middle = data[Math.floor((data.length - 1) / 2)]?.label ?? '';
  const last = data[data.length - 1]?.label ?? '';

  return [first, middle, last];
}
