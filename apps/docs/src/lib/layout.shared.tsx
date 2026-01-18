import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import { FullEventLogo } from '@/components/logo/logo';

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: <FullEventLogo variant="stream" />,
    },
  };
}
