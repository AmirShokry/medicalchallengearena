import { getToken } from "#auth";
import { encode } from "next-auth/jwt";
import { authConfig } from "./[...]";
export default eventHandler(async (event) => {
  const token = await getToken({ event });
  const cookieName = authConfig?.cookies?.sessionToken?.name!;

  const newToken = await encode({
    secret: useRuntimeConfig().authSecret,
    token: {
      ...token, //Should send a new token
      isOk: true, // or any other field you want to update
    },
  });
  const tokenExp = token?.exp as number;
  const maxAge =
    authConfig?.cookies?.sessionToken?.options?.maxAge || tokenExp * 1000;
  setCookie(event, cookieName, newToken, {
    ...authConfig?.cookies?.sessionToken?.options,
    maxAge,
  });
});
