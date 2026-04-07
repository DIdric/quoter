import { redirect } from "next/navigation";

interface Props {
  params: Promise<{ code: string }>;
}

export default async function ReferralPage({ params }: Props) {
  const { code } = await params;
  redirect(`/login?ref=${encodeURIComponent(code)}&signup=1`);
}
