'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Breadcrumb } from 'antd';
import { AppstoreOutlined, HomeOutlined, TableOutlined, ThunderboltOutlined } from '@ant-design/icons';
import styles from './BattleBreadcrumb.module.css';
import { SIM_LOCAL_WORKSPACE_TABLE_ID } from '@/lib/simLocalTables/constants';

export function SimLocalTablesBreadcrumb() {
  const pathname = usePathname();
  const parts = pathname.split('/').filter(Boolean);
  const idx = parts.indexOf('local-tables');
  const tableId = idx >= 0 ? parts[idx + 1] : undefined;
  const isEditor = Boolean(tableId);

  const tail =
    isEditor && tableId
      ? [
        {
          title: (
            <span className={styles.breadcrumbCurrent}>
              <AppstoreOutlined />{' '}
              {tableId === SIM_LOCAL_WORKSPACE_TABLE_ID ? 'Studio workspace' : `${tableId.slice(0, 8)}…`}
            </span>
          ),
        },
      ]
      : [];

  return (
    <Breadcrumb
      className={styles.breadcrumb}
      items={[
        {
          title: (
            <span className={styles.breadcrumbLink}>
              <Link href="/simulation-system">
                <HomeOutlined /> Simulation system
              </Link>
            </span>
          ),
        },
        {
          title: (
            <span className={styles.breadcrumbLink}>
              <Link href="/simulation-system/battle">
                <ThunderboltOutlined /> Battle simulator
              </Link>
            </span>
          ),
        },
        {
          title: (
            <span className={isEditor ? styles.breadcrumbLink : styles.breadcrumbCurrent}>
              <Link href="/simulation-system/battle/local-tables">
                <TableOutlined /> Local tables
              </Link>
            </span>
          ),
        },
        ...tail,
      ]}
    />
  );
}
