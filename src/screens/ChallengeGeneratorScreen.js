import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { BackButton } from "../components/BackButton";
import { ChallengeCard } from "../components/ChallengeCard";
import { useChallengeStore } from "../store/challengeStore";
import { useMovieStore } from "../store/movieStore";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { generateChallenge } from "../utils/challenges";

const STEPS = [
  "Looking at your watch history...",
  "Checking your watchlist...",
  "Looking at your collections...",
  "Finding your next move...",
];
const STEP_DURATION_MS = 550;

export const ChallengeGeneratorScreen = ({ navigation }) => {
  const colors = useColors();
  const styles = createStyles(colors);
  const insets = useSafeAreaInsets();
  const watched = useMovieStore((state) => state.watched);
  const bucketList = useMovieStore((state) => state.bucketList);
  const acceptChallenge = useChallengeStore((state) => state.acceptChallenge);

  const [step, setStep] = useState(0);
  const [challenge, setChallenge] = useState(null);

  // Re-runs the staged-text reveal whenever `attempt` changes — both on
  // first mount and every "Give Me Another" tap.
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    setStep(0);
    setChallenge(null);
    const timers = STEPS.map((_, index) =>
      setTimeout(() => setStep(index + 1), STEP_DURATION_MS * (index + 1)),
    );
    const revealTimer = setTimeout(() => {
      setChallenge(generateChallenge({ watched, bucketList }));
    }, STEP_DURATION_MS * STEPS.length);
    return () => {
      timers.forEach(clearTimeout);
      clearTimeout(revealTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt]);

  const handleAccept = () => {
    acceptChallenge(challenge);
    navigation.goBack();
  };

  const handleSkip = () => setAttempt((value) => value + 1);

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <BackButton onPress={() => navigation.goBack()} />
      </View>

      <View style={styles.content}>
        {challenge ? (
          <Animated.View
            entering={FadeIn.duration(300)}
            style={styles.cardWrap}
          >
            <ChallengeCard
              challenge={challenge}
              mode="reveal"
              onAccept={handleAccept}
              onSkip={handleSkip}
            />
          </Animated.View>
        ) : (
          <View style={styles.stepsWrap}>
            {STEPS.slice(0, step + 1).map((text, index) => (
              <Animated.Text
                key={text}
                entering={FadeIn.duration(300)}
                style={[
                  styles.stepText,
                  index === step && styles.stepTextActive,
                ]}
              >
                {text}
              </Animated.Text>
            ))}
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      paddingHorizontal: spacing.md,
    },
    content: {
      flex: 1,
      justifyContent: "center",
      paddingHorizontal: spacing.md,
    },
    stepsWrap: {
      gap: spacing.md,
    },
    stepText: {
      ...typography.subtitle,
      color: colors.textMuted,
      textAlign: "center",
    },
    stepTextActive: {
      color: colors.textPrimary,
    },
    cardWrap: {
      width: "100%",
    },
  });

export default ChallengeGeneratorScreen;
