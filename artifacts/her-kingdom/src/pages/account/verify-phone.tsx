import { Redirect } from "wouter";
import { Seo } from "@/components/seo";

export default function AccountVerifyPhonePage() {
  return (
    <>
      <Seo title="Verify Phone" description="Phone verification redirect." noindex />
      <Redirect to="/account/login" />
    </>
  );
}
