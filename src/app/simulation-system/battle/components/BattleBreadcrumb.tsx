'use client';

import Link from 'next/link';
import { Breadcrumb } from 'antd';
import {
  HomeOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import styles from './BattleBreadcrumb.module.css';

/** Breadcrumb for battle simulator routes (excluding skills sub-layout). */
export function BattleBreadcrumb() {
  return (
    <Breadcrumb
      className={styles.breadcrumb}
      items={[
        {
          title: (
            <span className={styles.breadcrumbLink}>
              <Link href="/simulation-system"><HomeOutlined /> Simulation system</Link>
            </span>
          ),
        },
        {
          title: (
            <span className={styles.breadcrumbCurrent}>
              <ThunderboltOutlined /> Battle simulator
            </span>
          ),
        },
      ]}
    />
  );
}
