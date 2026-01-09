import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Home() {
  return (
    <main className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <h1 className="text-3xl font-bold text-foreground">
          ツール統合ポータル
        </h1>
        <p className="text-muted-foreground">
          shadcn/ui コンポーネントとテーマのテストページ
        </p>

        {/* Button variants */}
        <Card>
          <CardHeader>
            <CardTitle>Button コンポーネント</CardTitle>
            <CardDescription>各種バリアントのテスト</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-4">
            <Button variant="default">Default</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="destructive">Destructive</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="link">Link</Button>
          </CardContent>
        </Card>

        {/* Badge variants */}
        <Card>
          <CardHeader>
            <CardTitle>Badge コンポーネント</CardTitle>
            <CardDescription>各種バリアントのテスト</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-4">
            <Badge variant="default">Default</Badge>
            <Badge variant="secondary">Secondary</Badge>
            <Badge variant="destructive">Destructive</Badge>
            <Badge variant="outline">Outline</Badge>
          </CardContent>
        </Card>

        {/* Theme check */}
        <Card>
          <CardHeader>
            <CardTitle>テーマ確認</CardTitle>
            <CardDescription>CSS変数が正しく適用されているか確認</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex gap-4">
              <div className="w-16 h-16 bg-primary rounded-lg" title="primary" />
              <div className="w-16 h-16 bg-secondary rounded-lg" title="secondary" />
              <div className="w-16 h-16 bg-accent rounded-lg" title="accent" />
              <div className="w-16 h-16 bg-muted rounded-lg" title="muted" />
              <div className="w-16 h-16 bg-destructive rounded-lg" title="destructive" />
            </div>
            <p className="text-sm text-muted-foreground">
              上記の色ブロックが表示されていれば、テーマが正しく適用されています。
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
