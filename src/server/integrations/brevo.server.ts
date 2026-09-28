import { z } from "zod";
import { getServerEnv } from "../env.server";
import { AppError } from "../errors/app-error.server";

export function invitationsConfigured() {
  const env = getServerEnv();
  return Boolean(
    env.BREVO_API_KEY &&
    z.string().email().safeParse(env.BREVO_SENDER_EMAIL).success &&
    env.BREVO_SENDER_NAME &&
    env.PUBLIC_APP_URL,
  );
}

export function requireInvitationConfig() {
  if (!invitationsConfigured())
    throw new AppError(
      "INVITATIONS_NOT_CONFIGURED",
      503,
      "Les invitations ne sont pas encore configurées.",
    );
}

function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[character]!,
  );
}

export function invitationEmail(
  name: string,
  url: string,
  language: "fr" | "ru",
  role: "ADMIN" | "CONTRACTOR" = "CONTRACTOR",
) {
  const copy =
    language === "ru"
      ? {
          subject: "Активируйте доступ к Voirie Connect",
          greeting: `Здравствуйте, ${name}!`,
          body: `Вас пригласили в пространство ${role === "ADMIN" ? "администратора" : "подрядчика"} Voirie Connect. Выберите пароль, чтобы активировать доступ. Ссылка действует 48 часов и может быть использована только один раз.`,
          action: "Активировать доступ",
          footer: "Если ссылка истекла, попросите администратора отправить новое приглашение.",
        }
      : {
          subject: "Activez votre accès à Voirie Connect",
          greeting: `Bonjour ${name},`,
          body: `Vous êtes invité à rejoindre l’espace ${role === "ADMIN" ? "administrateur" : "entreprise"} de Voirie Connect. Choisissez votre mot de passe pour activer votre accès. Ce lien est valable 48 heures et utilisable une seule fois.`,
          action: "Activer mon accès",
          footer:
            "Si le lien a expiré, demandez à l’administrateur de vous renvoyer une invitation.",
        };
  return {
    subject: copy.subject,
    textContent: `${copy.greeting}\n\n${copy.body}\n\n${copy.action} : ${url}\n\n${copy.footer}`,
    htmlContent: `<html lang="${language}"><body><p>${escapeHtml(copy.greeting)}</p><p>${escapeHtml(copy.body)}</p><p><a href="${escapeHtml(url)}">${copy.action}</a></p><p>${copy.footer}</p></body></html>`,
  };
}

export async function sendInvitationEmail(input: {
  email: string;
  name: string;
  token: string;
  language: "fr" | "ru";
  role?: "ADMIN" | "CONTRACTOR";
}) {
  requireInvitationConfig();
  const env = getServerEnv();
  const url = new URL(
    input.role === "ADMIN" ? "/activate" : "/contractor/activate",
    env.PUBLIC_APP_URL,
  );
  url.hash = new URLSearchParams({ token: input.token, lang: input.language }).toString();
  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": env.BREVO_API_KEY!,
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      sender: { name: env.BREVO_SENDER_NAME, email: env.BREVO_SENDER_EMAIL },
      to: [{ email: input.email, name: input.name.slice(0, 70) }],
      ...invitationEmail(input.name, url.toString(), input.language, input.role),
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error("brevo_delivery_failed");
  const body: unknown = await response.json();
  if (
    !body ||
    typeof body !== "object" ||
    !("messageId" in body) ||
    typeof body.messageId !== "string"
  )
    throw new Error("brevo_response_invalid");
  return body.messageId;
}
