import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useRef } from "react";

// Refetch when a screen comes back into view. TanStack Query refetches on
// mount by itself; a stacked screen stays mounted underneath the next one,
// so coming back to it needs this.
export const useRefetchOnFocus = (refetch) => {
  const firstFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (firstFocus.current) {
        firstFocus.current = false;
        return;
      }
      refetch();
    }, [refetch]),
  );
};

export default useRefetchOnFocus;
