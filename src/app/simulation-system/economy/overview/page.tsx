'use client';

import Link from 'next/link';
import { Card, Badge, Tooltip } from 'antd';
import {
  UserOutlined,
  ShoppingOutlined,
  TrophyOutlined,
  BankOutlined,
  StarOutlined,
  ExperimentOutlined,
} from '@ant-design/icons';
import styles from './EconomySimulator.module.css';

const MODULES = [
  {
    id: 'characters',
    name: 'Characters',
    icon: <UserOutlined />,
    path: '/simulation-system/economy/characters',
    description: 'Hero growth, stats, and talent systems',
    color: '#1890ff',
  },
  {
    id: 'equipment',
    name: 'Equipment',
    icon: <ShoppingOutlined />,
    path: '/simulation-system/economy/equipment',
    description: 'Enhancement, crafting, and quality stats',
    color: '#fa8c16',
  },
  {
    id: 'arena',
    name: 'Arena',
    icon: <TrophyOutlined />,
    path: '/simulation-system/economy/arena',
    description: 'Ranked PVP rewards and prestige',
    color: '#f5222d',
  },
  {
    id: 'levels',
    name: 'Levels',
    icon: <BankOutlined />,
    path: '/simulation-system/economy/levels',
    description: 'Stamina costs and rewards per stage',
    color: '#52c41a',
  },
  {
    id: 'prestige',
    name: 'Prestige',
    icon: <StarOutlined />,
    path: '/simulation-system/economy/prestige',
    description: 'Rank tiers, prestige accrual, and daily income',
    color: '#eb2f96',
  },
  {
    id: 'calculator',
    name: 'Calculator',
    icon: <ExperimentOutlined />,
    path: '/simulation-system/economy/calculator',
    description: 'Combined income and growth planning',
    color: '#13c2c2',
  },
] as const;

/** Economy simulator hub (nested under simulation-system). */
export default function EconomySimulatorPage() {
  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.headerIcon} aria-hidden>
            <ExperimentOutlined />
          </span>
          <div className={styles.headerTitle}>
            <h1>Economy simulator</h1>
            <p>Design-time economy tools</p>
          </div>
        </div>
        <Badge status="processing" text="Live calculations" />
        <Link href="/simulation-system" className={styles.backButton}>
          Back
        </Link>
      </header>

      <main className={styles.mainContent}>
        <aside className={styles.sidebar}>
          <div className={styles.sidebarTitle}>Modules</div>
          <nav className={styles.moduleNav}>
            {MODULES.map((module) => (
              <Tooltip key={module.id} title={module.description} placement="right">
                <Link
                  href={module.path}
                  className={styles.moduleItem}
                  style={
                    {
                      '--module-color': module.color,
                    } as React.CSSProperties
                  }
                >
                  <span className={styles.moduleIcon}>{module.icon}</span>
                  <span className={styles.moduleText}>
                    <span className={styles.moduleNameCn}>{module.name}</span>
                  </span>
                </Link>
              </Tooltip>
            ))}
          </nav>
        </aside>

        <section className={styles.content}>
          <Card className={styles.introCard} variant="borderless">
            <div className={styles.introHeader}>
              <span className={styles.introIcon} style={{ color: '#722ed1' }}>
                <ExperimentOutlined />
              </span>
              <div className={styles.introTitle}>
                <h2>Economy simulator</h2>
                <p>Design-time economy tools</p>
              </div>
            </div>
            <p className={styles.introDesc}>
              Reference data inspired by mobile strategy titles; models stamina, silver, prestige, and growth loops.
            </p>
          </Card>

          <div className={styles.statsGrid}>
            <Card className={styles.statCard}>
              <div className={styles.statValue}>36</div>
              <div className={styles.statLabel}>Heroes</div>
            </Card>
            <Card className={styles.statCard}>
              <div className={styles.statValue}>200+</div>
              <div className={styles.statLabel}>Equipment entries</div>
            </Card>
            <Card className={styles.statCard}>
              <div className={styles.statValue}>50</div>
              <div className={styles.statLabel}>Stages</div>
            </Card>
            <Card className={styles.statCard}>
              <div className={styles.statValue}>37</div>
              <div className={styles.statLabel}>Prestige tiers</div>
            </Card>
          </div>

          <div className={styles.moduleGrid}>
            {MODULES.map((module) => (
              <Link key={module.id} href={module.path} className={styles.moduleCard}>
                <div className={styles.moduleCardIcon} style={{ backgroundColor: module.color }}>
                  {module.icon}
                </div>
                <div className={styles.moduleCardContent}>
                  <div className={styles.moduleCardTitle}>{module.name}</div>
                  <div className={styles.moduleCardDesc}>{module.description}</div>
                </div>
              </Link>
            ))}
          </div>

          <Card className={styles.infoCard} variant="borderless">
            <h3 className={styles.infoTitle}>About</h3>
            <div className={styles.infoContent}>
              <p>
                This hub links standalone calculators for resource pacing. Numbers are illustrative for simulation, not
                live service telemetry.
              </p>
              <ul className={styles.infoList}>
                <li>
                  <strong>Characters:</strong> base stats, aptitude, rarity, and camp tags.
                </li>
                <li>
                  <strong>Equipment:</strong> enhancement costs and quality bands.
                </li>
                <li>
                  <strong>Arena:</strong> daily rewards from rank and challenge cadence.
                </li>
                <li>
                  <strong>Levels:</strong> stamina spend vs. repeatable rewards.
                </li>
                <li>
                  <strong>Prestige:</strong> tier upkeep, daily tax, and promotion pacing.
                </li>
              </ul>
            </div>
          </Card>
        </section>
      </main>
    </div>
  );
}
