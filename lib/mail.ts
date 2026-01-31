import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendPasswordResetEmail = async (
  email: string, 
  token: string
) => {
  // Reset linki (Domain'i canlıya alınca değiştirmeyi unutma)
  const resetLink = `http://localhost:3000/new-password?token=${token}`;

  await resend.emails.send({
    from: "onboarding@resend.dev", // Kendi domainin varsa onu yaz
    to: email,
    subject: "Şifrenizi Sıfırlayın - ATA Yazılım",
    html: `<p>Şifrenizi sıfırlamak için <a href="${resetLink}">buraya tıklayın</a>.</p>`
  });
};