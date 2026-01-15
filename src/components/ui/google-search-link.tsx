'use client';

import { ExternalLink } from 'lucide-react';

interface GoogleSearchLinkProps {
  name: string;
  truncateAt?: number;
  className?: string;
}

export function GoogleSearchLink({ name, truncateAt = 30, className = '' }: GoogleSearchLinkProps) {
  const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(name + ' Massachusetts')}`;
  const displayName = truncateAt && name.length > truncateAt ? name.slice(0, truncateAt) + '...' : name;

  return (
    <a
      href={searchUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-1 rounded px-2 py-1 text-sm text-blue-600 hover:bg-blue-50 hover:underline transition-colors ${className}`}
      title={`Search Google for "${name}"`}
    >
      {displayName}
      <ExternalLink className="h-3 w-3 opacity-50" />
    </a>
  );
}
