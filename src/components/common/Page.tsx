import type { PropsWithChildren } from 'react';

export function Page({ children, centered = false }: PropsWithChildren<{ centered?: boolean }>) {
  return <main className={`page ${centered ? 'page-centered' : ''}`}>{children}</main>;
}
