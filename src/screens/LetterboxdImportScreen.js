import { FileText } from "lucide-react-native";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Text } from "../components/AppText";
import { PrimaryButton } from "../components/PrimaryButton";
import { StackHeader, useStackHeaderScroll } from "../components/ScreenHeader";
import { t } from "../i18n";
import { api } from "../services/api";
import { queryClient, queryKeys } from "../services/queryClient";
import { shape, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { readLetterboxdExport } from "../utils/letterboxd";

// What the server takes in one go (routes/library.js).
const CHUNK = 200;
const MISSING_SHOWN = 30;

const STEPS = [
  "On letterboxd.com, open Settings → Data → Export your data.",
  "Unzip the file it gives you.",
  "Choose watched.csv, ratings.csv and watchlist.csv below — any or all.",
];

// Bring your Letterboxd history in: pick the export's CSVs, see what's in
// them, then add it — watched films (with stars as tiers: 5★ is S, 4★ A…)
// and your watchlist. It adds to your library and never replaces anything.
export const LetterboxdImportScreen = ({ navigation }) => {
  const headerScroll = useStackHeaderScroll();
  const colors = useColors();
  const styles = createStyles(colors);
  const insets = useSafeAreaInsets();
  // idle → ready (files read) → importing → done
  const [stage, setStage] = useState("idle");
  const [data, setData] = useState(null);
  const [fileNames, setFileNames] = useState([]);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const choose = async () => {
    setError(null);
    try {
      // Loaded here, not up top: an app built before these were added can
      // still open everything else.
      const DocumentPicker = await import("expo-document-picker");
      const { File } = await import("expo-file-system");
      const picked = await DocumentPicker.getDocumentAsync({
        type: ["text/csv", "text/comma-separated-values", "application/csv", "text/plain"],
        multiple: true,
        copyToCacheDirectory: true,
      });
      if (picked.canceled || !picked.assets?.length) return;
      const files = await Promise.all(
        picked.assets.map(async (asset) => ({ name: asset.name ?? "", text: await new File(asset.uri).text() })),
      );
      const read = readLetterboxdExport(files);
      if (read.watched.length === 0 && read.watchlist.length === 0) {
        setError(t("Those files have no films in them. Pick the CSVs from your Letterboxd export."));
        return;
      }
      setFileNames(files.map((file) => file.name));
      setData(read);
      setStage("ready");
    } catch {
      setError(t("Couldn't open those files. Update ReelBoard and try again."));
    }
  };

  const start = async () => {
    const chunks = [];
    for (let i = 0; i < data.watched.length; i += CHUNK) {
      chunks.push({ watched: data.watched.slice(i, i + CHUNK), watchlist: [] });
    }
    for (let i = 0; i < data.watchlist.length; i += CHUNK) {
      chunks.push({ watched: [], watchlist: data.watchlist.slice(i, i + CHUNK) });
    }
    const total = data.watched.length + data.watchlist.length;
    setStage("importing");
    setError(null);
    setProgress({ done: 0, total });
    const sum = { watched: 0, watchlist: 0, unmatched: [] };
    let done = 0;
    try {
      for (const chunk of chunks) {
        const response = await api.post("/me/import/letterboxd", chunk);
        sum.watched += response.watched;
        sum.watchlist += response.watchlist;
        sum.unmatched.push(...response.unmatched);
        done += chunk.watched.length + chunk.watchlist.length;
        setProgress({ done, total });
      }
      setResult(sum);
      setStage("done");
    } catch (err) {
      // What made it in stays; the rest can be tried again.
      setError(err?.message || t("The import stopped. Try again — films already added won't be doubled."));
      setStage("ready");
    } finally {
      queryClient.invalidateQueries({ queryKey: queryKeys.library });
      queryClient.invalidateQueries({ queryKey: queryKeys.profile });
    }
  };

  const rated = data?.watched.filter((entry) => entry.stars).length ?? 0;
  const share = progress.total ? progress.done / progress.total : 0;

  return (
    <View style={styles.container}>
      <StackHeader
        title={t("Import from Letterboxd")}
        onBack={() => navigation.goBack()}
        scrollY={headerScroll.scrollY}
      />
      <Animated.ScrollView
        onScroll={headerScroll.onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]}
        showsVerticalScrollIndicator={false}
      >
        {stage === "done" ? (
          <>
            <Text style={styles.title}>{t("Your Letterboxd is in")}</Text>
            <Text style={styles.body}>
              {t("{watched} watched and {watchlist} on your watchlist were added.", {
                watched: result.watched,
                watchlist: result.watchlist,
              })}
            </Text>
            {result.unmatched.length > 0 && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>
                  {t("{count} couldn't be matched", { count: result.unmatched.length })}
                </Text>
                {result.unmatched.slice(0, MISSING_SHOWN).map((film) => (
                  <Text key={`${film.title}|${film.year}`} style={styles.missing} numberOfLines={1}>
                    {film.year ? `${film.title} (${film.year})` : film.title}
                  </Text>
                ))}
                {result.unmatched.length > MISSING_SHOWN && (
                  <Text style={styles.missing}>
                    {t("…and {count} more", { count: result.unmatched.length - MISSING_SHOWN })}
                  </Text>
                )}
              </View>
            )}
            <PrimaryButton label={t("Done")} onPress={() => navigation.goBack()} style={styles.button} />
          </>
        ) : (
          <>
            <Text style={styles.title}>{t("Bring your films over")}</Text>
            <Text style={styles.body}>
              {t("Your watched films, ratings and watchlist. Stars become tiers — 5★ is S, 4★ is A, 3★ is B. Nothing you already have is replaced.")}
            </Text>

            <View style={styles.card}>
              {STEPS.map((step, index) => (
                <View key={step} style={styles.step}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>{index + 1}</Text>
                  </View>
                  <Text style={styles.stepText}>{t(step)}</Text>
                </View>
              ))}
            </View>

            {data && (
              <View style={styles.card}>
                <View style={styles.filesRow}>
                  <FileText size={18} color={colors.textSecondary} strokeWidth={2} />
                  <Text style={styles.files} numberOfLines={2}>
                    {fileNames.join(", ")}
                  </Text>
                </View>
                <Text style={styles.cardTitle}>
                  {t("{watched} watched ({rated} rated) · {watchlist} on your watchlist", {
                    watched: data.watched.length,
                    rated,
                    watchlist: data.watchlist.length,
                  })}
                </Text>
              </View>
            )}

            {stage === "importing" && (
              <View style={styles.progressWrap}>
                <View style={styles.track}>
                  <View style={[styles.fill, { width: `${Math.round(share * 100)}%` }]} />
                </View>
                <Text style={styles.progressText}>
                  {t("Matching films… {done} of {total}", { done: progress.done, total: progress.total })}
                </Text>
              </View>
            )}

            {!!error && <Text style={styles.error}>{error}</Text>}

            {stage === "ready" ? (
              <>
                <PrimaryButton
                  label={t("Import {count} films", { count: data.watched.length + data.watchlist.length })}
                  onPress={start}
                  style={styles.button}
                />
                <PrimaryButton label={t("Choose other files")} variant="outline" onPress={choose} style={styles.secondButton} />
              </>
            ) : (
              <PrimaryButton
                label={stage === "importing" ? t("Importing…") : t("Choose files")}
                onPress={choose}
                disabled={stage === "importing"}
                style={styles.button}
              />
            )}
          </>
        )}
      </Animated.ScrollView>
    </View>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      paddingHorizontal: spacing.md,
      paddingTop: spacing.lg,
    },
    title: {
      ...typography.hero,
      fontSize: 26,
      lineHeight: 32,
      color: colors.textPrimary,
    },
    body: {
      ...typography.body,
      color: colors.textSecondary,
      marginTop: spacing.sm,
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: shape.card,
      padding: spacing.md,
      marginTop: spacing.lg,
      gap: spacing.sm,
    },
    cardTitle: {
      ...typography.bodyBold,
      color: colors.textPrimary,
    },
    step: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: spacing.sm + 2,
    },
    stepNumber: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: colors.cardElevated,
      alignItems: "center",
      justifyContent: "center",
    },
    stepNumberText: {
      ...typography.caption,
      color: colors.textPrimary,
    },
    stepText: {
      ...typography.body,
      flex: 1,
      color: colors.textPrimary,
    },
    filesRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
    },
    files: {
      ...typography.caption,
      flex: 1,
      color: colors.textSecondary,
    },
    missing: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    progressWrap: {
      marginTop: spacing.lg,
      gap: spacing.sm,
    },
    track: {
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.cardElevated,
      overflow: "hidden",
    },
    fill: {
      height: "100%",
      backgroundColor: colors.brand,
    },
    progressText: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    error: {
      ...typography.caption,
      color: colors.danger,
      marginTop: spacing.md,
    },
    button: {
      marginTop: spacing.xl,
    },
    secondButton: {
      marginTop: spacing.sm,
    },
  });

export default LetterboxdImportScreen;
