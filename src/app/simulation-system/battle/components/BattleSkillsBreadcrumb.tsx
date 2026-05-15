'use client';

import Link from 'next/link';
import { Breadcrumb } from 'antd';
import { HomeOutlined, SettingOutlined, ThunderboltOutlined } from '@ant-design/icons';
import styles from './BattleBreadcrumb.module.css';

export function BattleSkillsBreadcrumb() {
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
            <span className={styles.breadcrumbLink}>
              <Link href="/simulation-system/battle"><ThunderboltOutlined /> Battle simulator</Link>
            </span>
          ),
        },
        {
          title: (
            <span className={styles.breadcrumbCurrent}>
              <SettingOutlined /> Battle skills
            </span>
          ),
        },
      ]}
    />
  );
}
