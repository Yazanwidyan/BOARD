// One shared entry point for the 🎲 "Create a Challenge" action, so Home,
// Movie Details, Collection Details, and Library all launch the exact same
// flow instead of each screen wiring up its own navigate() call.
export const openChallengeGenerator = (navigation) => {
  navigation.navigate("ChallengeGenerator");
};

export default openChallengeGenerator;
