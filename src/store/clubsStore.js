import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { t } from "../i18n";
import { api } from "../services/api";
import { queryKeys } from "../services/queryClient";
import { showToast } from "./toastStore";
import { useAuthStore } from "./authStore";

// Clubs (GET /api/clubs…): groups with a shared board, a "now watching"
// pick, a club tier list and a feed. Other people's data too, so plain
// TanStack queries; every change answers with the club as it now is, which
// goes straight into the cache.
//
//   summary (in the list)  { id, name, description, role, memberCount,
//                            movieIds, nowWatching, createdAt }
//   club (one, in full)    summary + { ownerId, inviteCode, members,
//                            movies: [{ movieId, addedBy, addedAt, watches }],
//                            nowWatching: { movieId, setAt, watches } | null }
//   watches                [{ userId, tier }] — members who watched it
export const CLUB_NAME_MAX = 40;
export const CLUB_DESCRIPTION_MAX = 200;

const EMPTY = [];

const useSignedIn = () => useAuthStore((state) => Boolean(state.token));

export const useClubs = () => {
  const query = useQuery({
    queryKey: queryKeys.clubs,
    queryFn: async () => (await api.get("/clubs")).clubs,
    enabled: useSignedIn(),
  });
  return { ...query, clubs: query.data ?? EMPTY };
};

export const useClub = (clubId) =>
  useQuery({
    queryKey: queryKeys.club(clubId),
    queryFn: async () => (await api.get(`/clubs/${clubId}`)).club,
    enabled: useSignedIn() && Boolean(clubId),
  });

// What members have done with the club's movies, newest first.
export const useClubActivity = (clubId) =>
  useQuery({
    queryKey: queryKeys.clubActivity(clubId),
    queryFn: async () =>
      (await api.get(`/clubs/${clubId}/activity?limit=30`)).activity,
    enabled: useSignedIn() && Boolean(clubId),
  });

export const useClubActions = () => {
  const queryClient = useQueryClient();

  const refreshList = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.clubs, exact: true });
  // A change answered with the club: cache it, refresh the list and feed.
  const settle = (club) => {
    queryClient.setQueryData(queryKeys.club(club.id), club);
    refreshList();
    queryClient.invalidateQueries({ queryKey: queryKeys.clubActivity(club.id) });
  };
  // Left or deleted: it's gone from here.
  const forget = (clubId) => {
    queryClient.removeQueries({ queryKey: queryKeys.club(clubId) });
    refreshList();
  };

  const create = useMutation({
    mutationFn: async ({ name, description = "", movieIds = [] }) =>
      (await api.post("/clubs", { name, description, movieIds })).club,
    onSuccess: settle,
  });
  const join = useMutation({
    mutationFn: async (code) => (await api.post("/clubs/join", { code })).club,
    onSuccess: settle,
  });
  // { clubId, name?, description?, nowWatching? (a movie id, or null) }
  const update = useMutation({
    mutationFn: async ({ clubId, ...changes }) =>
      (await api.patch(`/clubs/${clubId}`, changes)).club,
    onSuccess: settle,
  });
  const removeMember = useMutation({
    mutationFn: async ({ clubId, userId }) =>
      (await api.delete(`/clubs/${clubId}/members/${userId}`)).club,
    onSuccess: settle,
  });
  const newInviteCode = useMutation({
    mutationFn: async (clubId) =>
      (await api.post(`/clubs/${clubId}/invite`)).inviteCode,
    onSuccess: (inviteCode, clubId) =>
      queryClient.setQueryData(queryKeys.club(clubId), (club) =>
        club ? { ...club, inviteCode } : club,
      ),
  });
  const leave = useMutation({
    mutationFn: (clubId) => api.post(`/clubs/${clubId}/leave`),
    onSuccess: (data, clubId) => forget(clubId),
  });
  const remove = useMutation({
    mutationFn: (clubId) => api.delete(`/clubs/${clubId}`),
    onSuccess: (data, clubId) => forget(clubId),
  });

  // On or off a club's board — ticked at once (in the list's movieIds),
  // undone with a toast if the server says no.
  const toggleMovie = useMutation({
    mutationFn: async ({ clubId, movieId, on }) =>
      on
        ? (await api.post(`/clubs/${clubId}/movies`, { movieId })).club
        : (await api.delete(`/clubs/${clubId}/movies/${movieId}`)).club,
    onMutate: async ({ clubId, movieId, on }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.clubs, exact: true });
      const before = queryClient.getQueryData(queryKeys.clubs);
      queryClient.setQueryData(queryKeys.clubs, (clubs) =>
        clubs?.map((club) =>
          club.id !== clubId
            ? club
            : {
                ...club,
                movieIds: on
                  ? [...club.movieIds.filter((id) => id !== movieId), movieId]
                  : club.movieIds.filter((id) => id !== movieId),
              },
        ),
      );
      return { before };
    },
    onError: (error, variables, context) => {
      queryClient.setQueryData(queryKeys.clubs, context?.before);
      showToast(t("Couldn't update the club: {error}", { error: error.message }));
    },
    onSuccess: settle,
  });

  return {
    createClub: create.mutateAsync,
    joinClub: join.mutateAsync,
    updateClub: update.mutateAsync,
    removeMember: removeMember.mutateAsync,
    newInviteCode: newInviteCode.mutateAsync,
    leaveClub: leave.mutateAsync,
    deleteClub: remove.mutateAsync,
    toggleClubMovie: (clubId, movieId, on) =>
      toggleMovie.mutate({ clubId, movieId, on }),
    busy: create.isPending || join.isPending,
  };
};
