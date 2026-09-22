import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, { useSharedValue, withTiming } from "react-native-reanimated";

export const AppSplashScreen = () => {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.92);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 450 });
    scale.value = withTiming(1, { duration: 450 });
  }, [opacity, scale]);

  return (
    <View style={styles.container}>
      <Animated.Image
        source={require("../../assets/URWatch-logo-new.png")}
        style={styles.logo}
        resizeMode="contain"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    width: 120,
  },
});

export default AppSplashScreen;
