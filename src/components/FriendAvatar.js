import { StyleSheet, Text, View } from "react-native";

import { fonts } from "../theme/typography";
import { useColors } from "../theme/useColors";

const initials = (name) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");

// A friend's avatar: their initials on their colour, with a thin ring in
// the page colour so overlapping avatars stay separate.
export const FriendAvatar = ({ friend, size = 44, style }) => {
  const colors = useColors();
  return (
    <View
      style={[
        styles.circle,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: friend.color,
          borderColor: colors.background,
          borderWidth: Math.max(1.5, size * 0.05),
        },
        style,
      ]}
    >
      <Text
        style={[
          styles.text,
          { fontSize: size * 0.36, lineHeight: size * 0.44 },
        ]}
      >
        {initials(friend.name)}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  circle: {
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    fontFamily: fonts.extraBold,
    color: "#161719",
  },
});

export default FriendAvatar;
