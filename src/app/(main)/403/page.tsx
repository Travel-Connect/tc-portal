import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShieldX, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function ForbiddenPage() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <Card className="max-w-md w-full text-center">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center">
              <ShieldX className="w-8 h-8 text-destructive" />
            </div>
          </div>
          <CardTitle className="text-2xl">アクセス権限がありません</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            このページにアクセスする権限がありません。
            管理者にお問い合わせください。
          </p>
          <Link href="/">
            <Button>
              <ArrowLeft className="w-4 h-4 mr-2" />
              ホームに戻る
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
