import { useEffect, useState } from "react";
import { Keyboard, Platform } from "react-native";
import { useSharedValue, withTiming } from "react-native-reanimated";

const DURATION = 250;

// How tall the keyboard is right now, for something that sits above it
// (Search's field in the tab bar). Both platforms: with Android's
// edge-to-edge window (Expo's default) the keyboard no longer resizes the
// app, so nothing moves on its own there either.
// → { lift: a shared value that eases along with the keyboard, height: the
//   same as a plain number, for padding }
export const useKeyboardHeight = () => {
  const lift = useSharedValue(0);
  const [height, setHeight] = useState(0);
  useEffect(() => {
    const ios = Platform.OS === "ios";
    const move = (to, event) => {
      lift.value = withTiming(to, { duration: event?.duration || DURATION });
      setHeight(to);
    };
    const show = Keyboard.addListener(ios ? "keyboardWillShow" : "keyboardDidShow", (event) =>
      move(event.endCoordinates.height, event),
    );
    const hide = Keyboard.addListener(ios ? "keyboardWillHide" : "keyboardDidHide", (event) => move(0, event));
    return () => {
      show.remove();
      hide.remove();
    };
  }, [lift]);
  return { lift, height };
};

export default useKeyboardHeight;
