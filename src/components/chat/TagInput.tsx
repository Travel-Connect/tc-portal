"use client";

import { useState, useEffect, useRef } from "react";
import { X, Plus, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { createClient } from "@/lib/supabase/client";
import { createTag, addTagToThread, removeTagFromThread } from "@/lib/actions/chat";
import type { ChatTag } from "@/types/database";

interface TagInputProps {
  threadId: string;
  initialTags: ChatTag[];
  onTagsChange?: (tags: ChatTag[]) => void;
}

export function TagInput({ threadId, initialTags, onTagsChange }: TagInputProps) {
  const [tags, setTags] = useState<ChatTag[]>(initialTags);
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [suggestions, setSuggestions] = useState<ChatTag[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // 入力値が変わったらサジェストを取得
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (!inputValue.trim()) {
        setSuggestions([]);
        return;
      }

      setIsLoading(true);
      const supabase = createClient();
      const { data } = await supabase
        .from("chat_tags")
        .select("*")
        .ilike("name", `%${inputValue.trim()}%`)
        .order("name", { ascending: true })
        .limit(10);

      // 既に付与されているタグを除外
      const tagIds = new Set(tags.map((t) => t.id));
      setSuggestions((data || []).filter((t) => !tagIds.has(t.id)));
      setIsLoading(false);
    };

    const debounce = setTimeout(fetchSuggestions, 200);
    return () => clearTimeout(debounce);
  }, [inputValue, tags]);

  // ポップオーバーが開いたらフォーカス
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleAddTag = async (tag: ChatTag) => {
    setIsAdding(true);
    const result = await addTagToThread(threadId, tag.id);
    if (result.success) {
      const newTags = [...tags, tag];
      setTags(newTags);
      onTagsChange?.(newTags);
      setInputValue("");
      setSuggestions([]);
    }
    setIsAdding(false);
  };

  const handleCreateAndAddTag = async () => {
    if (!inputValue.trim()) return;

    setIsAdding(true);
    const createResult = await createTag(inputValue.trim());
    if (createResult.success && createResult.tag) {
      const addResult = await addTagToThread(threadId, createResult.tag.id);
      if (addResult.success) {
        const newTags = [...tags, createResult.tag];
        setTags(newTags);
        onTagsChange?.(newTags);
        setInputValue("");
        setSuggestions([]);
      }
    }
    setIsAdding(false);
  };

  const handleRemoveTag = async (tagId: string) => {
    const result = await removeTagFromThread(threadId, tagId);
    if (result.success) {
      const newTags = tags.filter((t) => t.id !== tagId);
      setTags(newTags);
      onTagsChange?.(newTags);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (suggestions.length > 0) {
        handleAddTag(suggestions[0]);
      } else if (inputValue.trim()) {
        handleCreateAndAddTag();
      }
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {tags.map((tag) => (
        <Badge
          key={tag.id}
          variant="secondary"
          className="flex items-center gap-1 pr-1"
        >
          {tag.name}
          <button
            onClick={() => handleRemoveTag(tag.id)}
            className="ml-0.5 rounded-full p-0.5 hover:bg-muted"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}

      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs text-muted-foreground"
          >
            <Plus className="h-3 w-3 mr-1" />
            タグ
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-2" align="start">
          <div className="space-y-2">
            <Input
              ref={inputRef}
              placeholder="タグを入力..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isAdding}
              className="h-8 text-sm"
            />

            {isLoading ? (
              <div className="flex items-center justify-center py-2">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : suggestions.length > 0 ? (
              <div className="space-y-1">
                {suggestions.map((tag) => (
                  <button
                    key={tag.id}
                    onClick={() => handleAddTag(tag)}
                    disabled={isAdding}
                    className="w-full text-left px-2 py-1 text-sm rounded hover:bg-muted disabled:opacity-50"
                  >
                    {tag.name}
                  </button>
                ))}
              </div>
            ) : inputValue.trim() ? (
              <button
                onClick={handleCreateAndAddTag}
                disabled={isAdding}
                className="w-full text-left px-2 py-1 text-sm rounded hover:bg-muted disabled:opacity-50"
              >
                <span className="text-muted-foreground">作成: </span>
                <span className="font-medium">{inputValue.trim()}</span>
              </button>
            ) : null}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}