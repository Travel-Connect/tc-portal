"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, LogOut } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

interface HeaderProps {
  userEmail?: string;
}

export function Header({ userEmail }: HeaderProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/tools?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <header className="h-16 border-b border-border bg-background sticky top-0 z-10">
      <div className="h-full px-6 flex items-center justify-between gap-4">
        {/* Search */}
        <form onSubmit={handleSearch} className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="ツールを検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </form>

        {/* User menu */}
        <div className="flex items-center gap-4">
          {userEmail && (
            <span className="text-sm text-muted-foreground">{userEmail}</span>
          )}
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            ログアウト
          </Button>
        </div>
      </div>
    </header>
  );
}
