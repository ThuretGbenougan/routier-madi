import { Receiver } from "@upstash/qstash";
import { getServerEnv } from "../env.server";
import { AuthenticationError } from "../errors/app-error.server";

export async function qstash(
  path: string,
  body?: unknown,
  headers?: Record<string, string>,
  method = "POST",
) {
  const env = getServerEnv();
  if (!env.QSTASH_TOKEN) throw new Error("QSTASH_NOT_CONFIGURED");
  const response = await fetch(`https://qstash.upstash.io/v2/${path}`, {
    method,
    headers: {
      authorization: `Bearer ${env.QSTASH_TOKEN}`,
      "content-type": "application/json",
      ...headers,
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) throw new Error(`QSTASH_HTTP_${response.status}`);
  return response.status === 204 ? {} : response.json();
}

export async function verifyQstash(request: Request) {
  const env = getServerEnv();
  if (!env.QSTASH_CURRENT_SIGNING_KEY || !env.QSTASH_NEXT_SIGNING_KEY || !env.PUBLIC_APP_URL)
    throw new AuthenticationError();
  const body = await request.text();
  const receiver = new Receiver({
    currentSigningKey: env.QSTASH_CURRENT_SIGNING_KEY,
    nextSigningKey: env.QSTASH_NEXT_SIGNING_KEY,
  });
  const url = `${env.PUBLIC_APP_URL.replace(/\/$/, "")}${new URL(request.url).pathname}`;
  let valid = false;
  try {
    valid = await receiver.verify({
      signature: request.headers.get("upstash-signature") ?? "",
      body,
      url,
    });
  } catch {
    /* Invalid signatures must not execute work. */
  }
  if (!valid) throw new AuthenticationError();
  return body;
}
