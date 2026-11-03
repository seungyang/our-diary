import { redirect } from "next/navigation";
import { readSession } from "@/lib/session";
import { LoginForm } from "@/components/login-form";
import { Page, PageHead, TopBar } from "@/components/page";

export default async function LoginPage() {
  if (await readSession()) redirect("/diary/bucket");

  return (
    <div className="min-h-dvh">
      <TopBar />
      <Page>
        <PageHead
          title="공책 펴기"
          sub="받은 아이디로 들어오세요. 처음이면 들어와서 상대에게 연결을 보내면 됩니다."
        />
        <LoginForm />
      </Page>
    </div>
  );
}
