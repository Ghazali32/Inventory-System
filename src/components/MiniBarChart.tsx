import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, typography, spacing } from '../theme';

interface BarDataPoint {
  label: string;
  value: number;
}

interface MiniBarChartProps {
  data: BarDataPoint[];
  height?: number;
  barColor?: string;
  barActiveColor?: string;
  showLabels?: boolean;
}

export const MiniBarChart: React.FC<MiniBarChartProps> = ({
  data,
  height = 100,
  barColor = colors.primaryLightest,
  barActiveColor = colors.primary,
  showLabels = true,
}) => {
  const maxValue = Math.max(...data.map((d) => d.value), 1);

  return (
    <View style={[styles.container, { height: height + (showLabels ? 22 : 0) }]}>
      <View style={[styles.barsContainer, { height }]}>
        {data.map((point, index) => {
          const barHeight = Math.max((point.value / maxValue) * height, 3);
          const isHighest = point.value === maxValue && point.value > 0;
          const hasValue = point.value > 0;

          return (
            <View key={index} style={styles.barWrapper}>
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.bar,
                    {
                      height: barHeight,
                      backgroundColor: isHighest
                        ? barActiveColor
                        : hasValue
                        ? barColor
                        : colors.divider,
                    },
                  ]}
                />
              </View>
            </View>
          );
        })}
      </View>
      {showLabels && (
        <View style={styles.labelsRow}>
          {data.map((point, index) => (
            <View key={index} style={styles.labelWrapper}>
              <Text style={styles.labelText} numberOfLines={1}>
                {point.label}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  barsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 5,
  },
  barWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  barTrack: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
    flex: 1,
  },
  bar: {
    width: '65%',
    minWidth: 6,
    maxWidth: 28,
    borderRadius: 5,
  },
  labelsRow: {
    flexDirection: 'row',
    gap: 5,
    marginTop: spacing.xs,
  },
  labelWrapper: {
    flex: 1,
    alignItems: 'center',
  },
  labelText: {
    ...typography.small,
    color: colors.textTertiary,
    fontSize: 9,
    textAlign: 'center',
  },
});
