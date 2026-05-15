'use client';

import Link from 'next/link';
import { Breadcrumb } from 'antd';
import {
  HomeOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';

/** Breadcrumb for economy simulator routes. */
export function EconomyBreadcrumb() {
  return (
    <Breadcrumb
      style={{ margin: '16px 24px' }}
      items={[
        { title: <Link href="/simulation-system"><HomeOutlined /> Simulation system</Link> },
        { title: <span><ThunderboltOutlined /> Economy simulator</span> },
      ]}
    />
  );
}
