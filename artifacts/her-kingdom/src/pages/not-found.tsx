import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { Link } from "wouter";
import { Seo } from "@/components/seo";
import { PAGE_SEO } from "@/lib/shaniidrx-seo";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#FFFBF5] px-4">
      <Seo {...PAGE_SEO.notFound} canonicalPath="/404" noindex />
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="flex mb-3 gap-2 items-center">
            <AlertCircle className="h-7 w-7" style={{ color: "#B91C1C" }} />
            <h1 className="text-2xl font-bold text-neutral-900">Page not found</h1>
          </div>
          <p className="mt-2 text-sm text-neutral-600">
            We couldn't find that page on Shaniid RX. It may have moved or never existed.
          </p>
          <div className="mt-5 grid grid-cols-2 gap-2">
            <Link
              href="/"
              className="block text-center px-4 py-2.5 rounded-lg text-sm font-bold text-white"
              style={{ background: "#3D0814" }}
            >
              Back home
            </Link>
            <Link
              href="/shop"
              className="block text-center px-4 py-2.5 rounded-lg text-sm font-bold border border-neutral-300 text-neutral-900"
            >
              Browse shop
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
