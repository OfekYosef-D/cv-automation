"use client";

import Image from "next/image";
import { useAuth } from "@/lib/auth";
import { Button } from "./ui/button";

export function UserMenu() {
  const { user, isLoading, isAuthenticated, login, logout } = useAuth();

  if (isLoading) {
    return (
      <div className="h-9 w-24 bg-slate-200 rounded-md animate-pulse" />
    );
  }

  if (!isAuthenticated) {
    return (
      <Button onClick={login} variant="outline">
        Sign in
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2">
        {user?.avatarUrl ? (
          <Image
            src={user.avatarUrl}
            alt={user.name ?? user.email ?? "User avatar"}
            width={32}
            height={32}
            className="h-8 w-8 rounded-full"
            unoptimized
          />
        ) : (
          <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 text-sm font-medium">
            {(user?.name ?? user?.email ?? "U").charAt(0).toUpperCase()}
          </div>
        )}
        <span className="text-sm text-slate-700 hidden sm:inline">
          {user?.name ?? user?.email}
        </span>
      </div>
      <Button onClick={logout} variant="outline">
        Sign out
      </Button>
    </div>
  );
}
