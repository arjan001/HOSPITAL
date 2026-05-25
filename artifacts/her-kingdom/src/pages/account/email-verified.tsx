import { Redirect } from "wouter";
import { Seo } from "@/components/seo";

export default function AccountEmailVerifiedPage() {
  return (
    <>
      <Seo title="Email Verified" description="Email verification redirect." noindex />
      <Redirect to="/account/login" />
    </>
  );
}
