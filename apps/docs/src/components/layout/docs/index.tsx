'use client';
import type * as PageTree from 'fumadocs-core/page-tree';
import { type ComponentProps, createContext, type ReactNode, use, useMemo, useState, useEffect } from 'react';
import { cn } from '../../../lib/cn';
import { TreeContextProvider, useTreeContext } from 'fumadocs-ui/contexts/tree';
import Link from 'fumadocs-core/link';
import { useSearchContext } from 'fumadocs-ui/contexts/search';
import { cva } from 'class-variance-authority';
import { usePathname } from 'fumadocs-core/framework';

interface SidebarContext {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

const SidebarContext = createContext<SidebarContext | null>(null);

export interface DocsLayoutProps {
  tree: PageTree.Root;
  children: ReactNode;
}

export function DocsLayout({ tree, children }: DocsLayoutProps) {
  return (
    <TreeContextProvider tree={tree}>
      <SidebarProvider>
        <header className="sticky top-0 bg-fd-background/80 backdrop-blur-md border-b border-fd-border/50 h-14 z-30">
          <nav className="flex flex-row items-center gap-2 size-full px-6">
            <Link href="/" className="flex items-center gap-2 font-bold text-xl tracking-tight">
              <div className="size-6 bg-fd-primary rounded-md" />
              FullEvent
            </Link>

            <div className="flex-1" />

            <div className="flex items-center gap-4">
              <SearchToggle className="px-3 py-1.5 rounded-md bg-fd-muted/50 border border-fd-border/50 text-fd-muted-foreground hover:bg-fd-muted transition-colors text-sm" />
              <NavbarSidebarTrigger className="md:hidden p-2 hover:bg-fd-accent rounded-md" />
            </div>
          </nav>
        </header>
        <main id="nd-docs-layout" className="flex flex-1 flex-row [--fd-nav-height:56px] min-h-screen">
          <Sidebar />
          <div className="flex-1 min-w-0 bg-fd-background">
            {children}
          </div>
        </main>
      </SidebarProvider>
    </TreeContextProvider>
  );
}

function SidebarProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <SidebarContext.Provider
      value={useMemo(
        () => ({
          open,
          setOpen,
        }),
        [open],
      )}
    >
      {children}
    </SidebarContext.Provider>
  );
}

function SearchToggle(props: ComponentProps<'button'>) {
  const search = useSearchContext();
  if (!search.enabled) return null;

  return (
    <button
      {...props}
      onClick={() => search.setOpenSearch?.(true)}
    >
      <span className="flex items-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
        Search...
        <kbd className="hidden sm:inline-block ml-auto pointer-events-none h-5 select-none items-center gap-1 rounded border bg-fd-muted px-1.5 font-mono text-[10px] font-medium text-fd-muted-foreground opacity-100">
          <span className="text-xs">⌘</span>K
        </kbd>
      </span>
    </button>
  );
}

function NavbarSidebarTrigger(props: ComponentProps<'button'>) {
  const ctx = use(SidebarContext);
  if (!ctx) return null;
  const { open, setOpen } = ctx;

  return (
    <button {...props} onClick={() => setOpen(!open)}>
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" x2="21" y1="6" y2="6" /><line x1="3" x2="21" y1="12" y2="12" /><line x1="3" x2="21" y1="18" y2="18" /></svg>
    </button>
  );
}

function Sidebar() {
  const { root } = useTreeContext();
  const ctx = use(SidebarContext);

  const children = useMemo(() => {
    function renderItems(items: PageTree.Node[]) {
      return items.map((item) => (
        <SidebarItem key={item.$id} item={item}>
          {item.type === 'folder' ? renderItems(item.children) : null}
        </SidebarItem>
      ));
    }

    return renderItems(root.children);
  }, [root]);

  if (!ctx) return null;
  const { open } = ctx;

  return (
    <aside
      className={cn(
        'fixed flex flex-col shrink-0 top-14 z-20 overflow-auto border-r border-fd-border/50 bg-fd-background/50 backdrop-blur-sm',
        'md:sticky md:h-[calc(100dvh-56px)] md:w-[280px]',
        'max-md:inset-x-0 max-md:bottom-0 transition-all duration-300',
        !open && 'max-md:translate-x-[-100%]',
      )}
    >
      <div className="flex flex-col gap-1 p-6">
        {children}
      </div>
    </aside>
  );
}

const linkVariants = cva(
  'flex items-center gap-2 w-full py-1.5 px-2 rounded-md text-sm text-fd-muted-foreground transition-all duration-200 hover:bg-fd-accent/50 hover:text-fd-accent-foreground group [&_svg]:size-3.5',
  {
    variants: {
      active: {
        true: 'bg-fd-primary/10 text-fd-primary font-medium border border-fd-primary/20 shadow-sm shadow-fd-primary/5',
        false: '',
      },
    },
  },
);

function SidebarFolder({ item, children }: { item: PageTree.Folder; children: ReactNode }) {
  const pathname = usePathname();
  // Check if any child is active to auto-expand
  const isActive = useMemo(() => {
    let active = false;
    if (item.index && pathname === item.index.url) active = true;

    function scan(children: PageTree.Node[]) {
      if (active) return;
      for (const child of children) {
        if (child.type === 'page' && child.url === pathname) {
          active = true;
          return;
        }
        if (child.type === 'folder') {
          scan(child.children);
        }
      }
    }
    scan(item.children);
    return active;
  }, [item, pathname]);

  const [open, setOpen] = useState(isActive);

  // Update open state if selection changes to inside this folder
  if (isActive && !open) {
    setOpen(true);
  }

  return (
    <div className="flex flex-col gap-0.5">
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "flex items-center gap-2 w-full py-1.5 px-2 text-sm text-fd-foreground/80 hover:text-fd-foreground hover:bg-fd-accent/40 rounded-md transition-colors group select-none text-left",
          isActive && !open && "text-fd-foreground font-medium"
        )}
      >
        <span className={cn("transition-transform duration-200 opacity-60 group-hover:opacity-100", open ? "rotate-90" : "")}>
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
        </span>
        {item.index ? (
          <Link
            href={item.index.url}
            className="flex-1 truncate"
            onClick={(e) => e.stopPropagation()}
          >
            {item.name}
          </Link>
        ) : (
          <span className="flex-1 truncate">{item.name}</span>
        )}
      </button>
      {open && (
        <div className="pl-4 ml-2 border-l border-fd-border/40 flex flex-col gap-0.5 animate-in slide-in-from-top-1 fade-in duration-200">
          {children}
        </div>
      )}
    </div>
  );
}

function SidebarItem({ item, children }: { item: PageTree.Node; children: ReactNode }) {
  const pathname = usePathname();

  if (item.type === 'page') {
    const isActive = pathname === item.url;
    return (
      <Link
        href={item.url}
        className={linkVariants({ active: isActive })}
      >
        {item.icon && <span className="opacity-80 group-hover:opacity-100 transition-opacity">{item.icon}</span>}
        <span className="truncate">{item.name}</span>
      </Link>
    );
  }

  if (item.type === 'separator') {
    return (
      <div className="mt-4 mb-2 flex items-center gap-2 px-2 pointer-events-none select-none">
        {item.icon}
        <p className="text-[10px] font-bold tracking-widest uppercase text-fd-muted-foreground/60">
          {item.name}
        </p>
      </div>
    );
  }

  if (item.type === 'folder') {
    return <SidebarFolder item={item}>{children}</SidebarFolder>;
  }

  return null;
}
