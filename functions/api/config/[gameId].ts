import {
  defaultGameConfig,
  type GameConfig,
} from "../../../shared/src/index.js";

export const onRequestGet: PagesFunction<unknown, "gameId"> = async (context) => {
  const gameId = (context.params.gameId as string) || "springbok-rush";
  const config: GameConfig = {
    ...defaultGameConfig,
    gameId,
  };

  return new Response(JSON.stringify(config), {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
};
