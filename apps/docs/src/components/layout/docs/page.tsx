'use client';

import { type ComponentProps, type ReactNode, useMemo } from 'react';
import { AnchorProvider, type TOCItemType, useActiveAnchors } from 'fumadocs-core/toc';
import { cn } from '../../../lib/cn';
import { useTreeContext } from 'fumadocs-ui/contexts/tree';
import { Link, usePathname } from 'fumadocs-core/framework';
import type * as PageTree from 'fumadocs-core/page-tree';

export interface DocsPageProps {
  toc?: TOCItemType[];
  full?: boolean;
  children: ReactNode;
}

export function DocsPage({ toc = [], ...props }: DocsPageProps) {
  return (
    <AnchorProvider toc={toc}>
      <div className="flex flex-row flex-1 min-w-0">
        <main className="flex-1 min-w-0 flex flex-col items-center">
          <article
            className={cn(
              'flex flex-1 flex-col w-full gap-10 px-6 py-12 md:px-12',
              props.full ? 'max-w-none' : 'max-w-[880px]',
            )}
          >
            <div className="space-y-10">
              {props.children}
            </div>
            <Footer />
          </article>
        </main>
        {!props.full && toc.length > 0 && (
          <aside className="sticky top-(--fd-nav-height) w-[260px] shrink-0 h-[calc(100dvh-var(--fd-nav-height))] p-8 overflow-auto max-xl:hidden border-l border-fd-border/50">
            <p className="text-[10px] font-bold tracking-widest uppercase text-fd-muted-foreground/60 mb-4">
              On this page
            </p>
            <div className="flex flex-col gap-1">
              {toc.map((item) => (
                <TocItem key={item.url} item={item} />
              ))}
            </div>
          </aside>
        )}
      </div>
    </AnchorProvider>
  );
}

export function DocsBody(props: ComponentProps<'div'>) {
  return (
    <div {...props} className={cn('prose prose-fd dark:prose-invert max-w-none', props.className)}>
      {props.children}
    </div>
  );
}

export function DocsDescription(props: ComponentProps<'p'>) {
  if (props.children === undefined) return null;

  return (
    <p {...props} className={cn('text-xl text-fd-muted-foreground font-light tracking-tight mt-3', props.className)}>
      {props.children}
    </p>
  );
}

export function DocsTitle(props: ComponentProps<'h1'>) {
  return (
    <h1 {...props} className={cn('text-4xl sm:text-5xl font-bold tracking-tight mb-4', props.className)}>
      {props.children}
    </h1>
  );
}

function TocItem({ item }: { item: TOCItemType }) {
  const activeAnchors = useActiveAnchors();
  const isActive = activeAnchors.includes(item.url.slice(1));

  return (
    <a
      href={item.url}
      className={cn(
        'text-sm transition-colors py-1 hover:text-fd-foreground',
        isActive ? 'text-fd-primary font-medium' : 'text-fd-muted-foreground'
      )}
      style={{
        paddingLeft: Math.max(0, item.depth - 2) * 12,
      }}
    >
      {item.title}
    </a>
  );
}

function Footer() {
  const { root } = useTreeContext();
  const pathname = usePathname();
  const flatten = useMemo(() => {
    const result: PageTree.Item[] = [];

    function scan(items: PageTree.Node[]) {
      for (const item of items) {
        if (item.type === 'page') result.push(item);
        else if (item.type === 'folder') {
          if (item.index) result.push(item.index);
          scan(item.children);
        }
      }
    }

    scan(root.children);
    return result;
  }, [root]);

  const { previous, next } = useMemo(() => {
    const idx = flatten.findIndex((item) => item.url === pathname);

    if (idx === -1) return {};
    return {
      previous: flatten[idx - 1],
      next: flatten[idx + 1],
    };
  }, [flatten, pathname]);

  return (
    <div className="flex flex-row justify-between gap-4 items-center pt-12 mt-12 border-t border-fd-border/50">
      {previous ? (
        <Link
          href={previous.url}
          className="group flex flex-col gap-2 p-4 rounded-xl border border-fd-border/50 hover:bg-fd-accent transition-all w-fit min-w-[160px]"
        >
          <span className="text-[10px] font-bold tracking-widest uppercase text-fd-muted-foreground/60 group-hover:text-fd-primary transition-colors">Previous</span>
          <span className="font-medium">{previous.name}</span>
        </Link>
      ) : <div />}
      {next ? (
        <Link
          href={next.url}
          className="group flex flex-col gap-2 p-4 rounded-xl border border-fd-border/50 hover:bg-fd-accent transition-all text-right w-fit min-w-[160px]"
        >
          <span className="text-[10px] font-bold tracking-widest uppercase text-fd-muted-foreground/60 group-hover:text-fd-primary transition-colors">Next</span>
          <span className="font-medium">{next.name}</span>
        </Link>
      ) : <div />}
    </div>
  );
}
