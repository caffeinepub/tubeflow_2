import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useActor } from "./useActor";

export function usePreference() {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["preference"],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getPreference();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useSavePreference() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      accentColor,
      playbackSpeed,
      exists,
    }: {
      accentColor: string;
      playbackSpeed: number;
      exists: boolean;
    }) => {
      if (!actor) throw new Error("No actor available");
      if (exists) {
        await actor.updatePreference("", accentColor, playbackSpeed);
      } else {
        await actor.createPreference("", accentColor, playbackSpeed);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["preference"] });
    },
  });
}
