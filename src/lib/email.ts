import nodemailer from "nodemailer";

const smtpHost = process.env.SMTP_HOST?.trim();
const smtpPort = Number(process.env.SMTP_PORT ?? 587);
const smtpSecure = process.env.SMTP_SECURE === "true";
const smtpUser = process.env.SMTP_USER?.trim();
// Gmail 앱 비밀번호를 "xxxx xxxx xxxx xxxx" 형식으로 넣어도 동작하도록 공백 제거
const smtpPass = (process.env.SMTP_PASS ?? "").replace(/\s+/g, "");

const transporter = nodemailer.createTransport({
  host: smtpHost,
  port: smtpPort,
  secure: smtpSecure,
  auth: {
    user: smtpUser,
    pass: smtpPass,
  },
});

export async function sendVerificationEmail(
  to: string,
  token: string,
): Promise<void> {
  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
  const verifyUrl = `${baseUrl}/api/auth/verify-email?token=${encodeURIComponent(token)}`;

  await transporter.sendMail({
    from: process.env.SMTP_FROM?.trim() || smtpUser,
    to,
    subject: "문샤인랜드 이메일 인증",
    text: [
      "문샤인랜드 회원가입을 완료하려면 아래 링크를 클릭하세요.",
      "",
      verifyUrl,
      "",
      "이 링크는 1시간 후에 만료됩니다.",
      "본인이 요청하지 않은 경우 이 메일을 무시하세요.",
    ].join("\n"),
    html: `
      <p>문샤인랜드 회원가입을 완료하려면 아래 버튼을 클릭하세요.</p>
      <p>
        <a href="${verifyUrl}"
           style="display:inline-block;padding:10px 20px;background:#0ea5e9;color:#fff;border-radius:6px;text-decoration:none;font-weight:600;">
          이메일 인증하기
        </a>
      </p>
      <p style="color:#6b7280;font-size:13px;">
        이 링크는 1시간 후에 만료됩니다.<br>
        본인이 요청하지 않은 경우 이 메일을 무시하세요.
      </p>
    `,
  });
}
