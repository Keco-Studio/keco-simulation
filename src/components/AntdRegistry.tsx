'use client';

import type { StyleProviderProps } from '@ant-design/cssinjs';
import { createCache, extractStyle, StyleProvider } from '@ant-design/cssinjs';
import { useServerInsertedHTML } from 'next/navigation';
import { useRef, useState, type ReactNode } from 'react';

type AntdRegistryProps = {
  children: ReactNode;
} & Omit<StyleProviderProps, 'cache'>;

/**
 * Aligns Ant Design v5 css-in-js between SSR and the browser so component class hashes match on hydration.
 * Pattern matches `@ant-design/nextjs-registry` (see Next.js App Router + antd docs).
 */
export default function AntdRegistry({ children, ...styleProviderProps }: AntdRegistryProps) {
  const [cache] = useState(() => createCache());
  const inserted = useRef(false);

  useServerInsertedHTML(() => {
    if (inserted.current) return null;
    inserted.current = true;
    const styleText = extractStyle(cache, { plain: true });
    return (
      <style
        id="antd-cssinjs"
        data-rc-order="prepend"
        data-rc-priority="-1000"
        dangerouslySetInnerHTML={{ __html: styleText }}
      />
    );
  });

  return (
    <StyleProvider cache={cache} hashPriority="high" {...styleProviderProps}>
      {children}
    </StyleProvider>
  );
}
