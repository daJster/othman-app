import { View, type ViewProps } from 'react-native';
import { cn } from '../cn';
import { Icon } from '../icon';
import { Text } from '../text';

/**
 * A compact stepper for a short sequence of milestones or setup tasks.
 *
 * This is a display component, not a wizard: each step has a status, and the
 * connector before a node is filled only when the previous step is complete.
 * That makes the sequence readable as progress rather than as four unrelated
 * badges. The nodes are 32 px and the labels sit beneath them, so the whole
 * row still fits a 375 px phone with Arabic labels.
 *
 * A step is never labelled by colour alone — completed nodes carry a check and
 * current/upcoming nodes carry their number.
 */
export type StepStatus = 'complete' | 'current' | 'upcoming';

export type StepItem = {
  key: string;
  label: string;
  status: StepStatus;
};

export type StepsProps = Omit<ViewProps, 'children'> & {
  steps: readonly StepItem[];
  testID?: string;
};

export function Steps({ steps, className, testID, ...props }: StepsProps) {
  return (
    <View
      testID={testID}
      className={cn('w-full flex-row items-start', className)}
      accessibilityRole="list"
      {...props}
    >
      {steps.map((step, index) => (
        <View
          key={step.key}
          className="flex-1 items-center gap-2"
          accessibilityRole="listitem"
        >
          <View className="w-full flex-row items-center">
            <Connector
              visible={index > 0}
              complete={steps[index - 1]?.status === 'complete'}
            />

            <View
              className={cn(
                'h-8 w-8 items-center justify-center rounded-full border-2',
                nodeClass(step.status),
              )}
              accessibilityLabel={step.label}
            >
              {step.status === 'complete' ? (
                <Icon name="check" size={16} tone="primary-foreground" />
              ) : (
                <Text
                  variant="caption"
                  className={cn(
                    'font-semibold',
                    step.status === 'current'
                      ? 'text-primary'
                      : 'text-muted-foreground',
                  )}
                >
                  {index + 1}
                </Text>
              )}
            </View>

            <Connector
              visible={index < steps.length - 1}
              complete={step.status === 'complete'}
            />
          </View>

          <Text
            variant="caption"
            tone={step.status === 'upcoming' ? 'muted' : 'default'}
            align="center"
            className="leading-snug"
          >
            {step.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

function nodeClass(status: StepStatus): string {
  if (status === 'complete') return 'border-primary bg-primary';
  if (status === 'current') return 'border-primary bg-background';
  return 'border-border bg-background';
}

function Connector({
  visible,
  complete,
}: {
  visible: boolean;
  complete: boolean;
}) {
  return (
    <View
      className={cn(
        'h-0.5 flex-1',
        !visible && 'bg-transparent',
        visible && (complete ? 'bg-primary' : 'bg-border'),
      )}
    />
  );
}
