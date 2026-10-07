import DateTimePicker, {
  DateTimePickerAndroid,
} from "@react-native-community/datetimepicker";
import { useEffect, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { radius, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { BottomSheet } from "./BottomSheet";
import { PrimaryButton } from "./PrimaryButton";

const DAY_MS = 24 * 60 * 60 * 1000;
const MIN_DATE = new Date(1900, 0, 1);
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const startOfDay = (date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());
const sameDay = (a, b) => startOfDay(a).getTime() === startOfDay(b).getTime();
const formatLong = (date) =>
  `${MONTHS[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;

// Quick picks, relative to now.
const QUICK = [
  { label: "Today", daysAgo: 0 },
  { label: "Yesterday", daysAgo: 1 },
  { label: "A week ago", daysAgo: 7 },
  { label: "A month ago", daysAgo: 30 },
];

// "When did you watch it?" — quick picks plus the platform's own date
// picker (iOS: a calendar right in the sheet; Android: the system date
// dialog). Never later than today. Saves through onSave(timestamp).
export const WatchDateSheet = ({ visible, timestamp, onSave, onClose }) => {
  const colors = useColors();
  const styles = createStyles(colors);
  const [date, setDate] = useState(() => new Date(timestamp ?? Date.now()));

  // Start from the current date each time it opens.
  useEffect(() => {
    if (visible) setDate(new Date(timestamp ?? Date.now()));
  }, [visible, timestamp]);

  const today = new Date();

  const openAndroidPicker = () =>
    DateTimePickerAndroid.open({
      value: date,
      mode: "date",
      maximumDate: today,
      minimumDate: MIN_DATE,
      onChange: (event, picked) => {
        if (event.type === "set" && picked) setDate(picked);
      },
    });

  const save = () => {
    // Keep the time of day for "today" (so it sorts as most recent);
    // other days are stored at midday.
    const value = sameDay(date, today)
      ? Date.now()
      : startOfDay(date).getTime() + 12 * 60 * 60 * 1000;
    onSave(value);
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      size="auto"
      title="When did you watch it?"
      subtitle={formatLong(date)}
      footer={<PrimaryButton label="Save date" onPress={save} />}
    >
      <View style={styles.quickRow}>
        {QUICK.map(({ label, daysAgo }) => {
          const quickDate = new Date(Date.now() - daysAgo * DAY_MS);
          const active = sameDay(quickDate, date);
          return (
            <Pressable
              key={label}
              style={[styles.quick, active && styles.quickActive]}
              onPress={() => setDate(quickDate)}
            >
              <Text
                style={[styles.quickText, active && styles.quickTextActive]}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {Platform.OS === "ios" ? (
        <DateTimePicker
          value={date}
          mode="date"
          display="inline"
          maximumDate={today}
          minimumDate={MIN_DATE}
          themeVariant="dark"
          accentColor={colors.accent}
          onChange={(event, picked) => {
            if (picked) setDate(picked);
          }}
          style={styles.calendar}
        />
      ) : (
        <Pressable style={styles.pickButton} onPress={openAndroidPicker}>
          <Text style={styles.pickLabel}>Pick a date</Text>
          <Text style={styles.pickValue}>{formatLong(date)}</Text>
        </Pressable>
      )}
    </BottomSheet>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    quickRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.sm,
    },
    quick: {
      paddingHorizontal: spacing.md,
      paddingVertical: 8,
      backgroundColor: colors.card,
    },
    quickActive: {
      backgroundColor: colors.selected,
    },
    quickText: {
      ...typography.bodyBold,
      fontSize: 13,
      color: colors.textSecondary,
    },
    quickTextActive: {
      color: colors.selectedText,
    },
    calendar: {
      marginTop: spacing.sm,
    },
    pickButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginTop: spacing.md,
      padding: spacing.md,
      backgroundColor: colors.card,
    },
    pickLabel: {
      ...typography.bodyBold,
      color: colors.textPrimary,
    },
    pickValue: {
      ...typography.body,
      color: colors.textSecondary,
    },
  });

export default WatchDateSheet;
