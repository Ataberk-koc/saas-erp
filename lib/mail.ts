import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendPasswordResetEmail = async (
  email: string, 
  token: string
) => {
  // Reset linki (Domain'i canlıya alınca değiştirmeyi unutma)
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const resetLink = `${baseUrl}/new-password?token=${token}`;

  await resend.emails.send({
    from: "ataberkkoc34@icloud.com",
    to: email,
    subject: "Şifrenizi Sıfırlayın - ATA Yazılım",
    html: `<p>Şifrenizi sıfırlamak için <a href="${resetLink}">buraya tıklayın</a>.</p>`
  });
};