import React from 'react';

interface SkeletonProps { className?: string; }

export function Skeleton({ className = '' }: SkeletonProps) {
  return <div className={`skeleton ${className}`} />;
}

function Sk({ className = '' }: SkeletonProps) {
  return (
    <div className={`animate-pulse rounded-xl bg-gray-100 ${className}`} />
  );
}

export function SkeletonOwnerDashboard() {
  return (
    <div className="max-w-lg mx-auto pb-24 pt-2">
      <div className="px-5 pt-4 pb-3 flex items-start justify-between">
        <div className="space-y-2">
          <Sk className="h-7 w-36" />
          <Sk className="h-4 w-52" />
        </div>
        <Sk className="w-10 h-10 rounded-full shrink-0" />
      </div>
      <Sk className="mx-5 h-44 rounded-2xl" />
      <div className="grid grid-cols-4 gap-4 px-5 mt-5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-2">
            <Sk className="w-12 h-12 rounded-2xl" />
            <Sk className="h-3 w-10" />
          </div>
        ))}
      </div>
      <div className="mt-5 px-5">
        <Sk className="h-5 w-28 mb-3" />
        <div className="flex gap-3 overflow-hidden">
          {Array.from({ length: 3 }).map((_, i) => (
            <Sk key={i} className="h-40 w-36 flex-shrink-0 rounded-2xl" />
          ))}
        </div>
      </div>
      <div className="mt-5 px-5 space-y-3">
        <Sk className="h-5 w-28 mb-1" />
        {Array.from({ length: 2 }).map((_, i) => (
          <Sk key={i} className="h-20 w-full rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

export function SkeletonWalkerDashboard() {
  return (
    <div className="max-w-lg mx-auto pb-24 pt-2">
      <div className="px-5 pt-5 flex items-center gap-3 mb-5">
        <Sk className="w-12 h-12 rounded-full shrink-0" />
        <div className="space-y-2 flex-1">
          <Sk className="h-5 w-28" />
          <Sk className="h-3 w-44" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3 px-5 mb-5">
        {Array.from({ length: 3 }).map((_, i) => (
          <Sk key={i} className="h-20 rounded-2xl" />
        ))}
      </div>
      <div className="px-5 space-y-3">
        <Sk className="h-5 w-24 mb-1" />
        {Array.from({ length: 4 }).map((_, i) => (
          <Sk key={i} className="h-24 w-full rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="bg-white border border-surface-border rounded-2xl p-5 shadow-card">
      <div className="flex items-center gap-3 mb-4">
        <Skeleton className="w-10 h-10 rounded-xl" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
      <div className="space-y-2">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-3/4" />
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4 bg-white rounded-xl border border-surface-border">
          <Skeleton className="w-8 h-8 rounded-full" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-24 ml-auto" />
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
      ))}
    </div>
  );
}
