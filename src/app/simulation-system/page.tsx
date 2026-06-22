'use client';

import Link from 'next/link';
import { Card, Badge } from 'antd';
import {
  UserOutlined,
  ShoppingOutlined,
  TrophyOutlined,
  BankOutlined,
  StarOutlined,
  ExperimentOutlined,
  ThunderboltOutlined,
  SettingOutlined,
  DollarOutlined,
  TableOutlined,
  RiseOutlined,
} from '@ant-design/icons';
import styles from './SimulationSystem.module.css';

/** Economy simulator module cards (hub). */
const ECONOMY_MODULES = [
  {
    id: 'characters',
    name: 'Characters',
    nameEn: 'Characters',
    icon: <UserOutlined />,
    path: '/simulation-system/economy/characters',
    description: 'Hero growth, base stats, and talent systems',
    color: '#1890ff',
  },
  {
    id: 'equipment',
    name: 'Equipment',
    nameEn: 'Equipment',
    icon: <ShoppingOutlined />,
    path: '/simulation-system/economy/equipment',
    description: 'Enhancement, crafting, and quality-based stats',
    color: '#fa8c16',
  },
  {
    id: 'arena',
    name: 'Arena',
    nameEn: 'Arena',
    icon: <TrophyOutlined />,
    path: '/simulation-system/economy/arena',
    description: 'Ranked rewards and prestige calculations',
    color: '#f5222d',
  },
  {
    id: 'levels',
    name: 'Levels',
    nameEn: 'Levels',
    icon: <BankOutlined />,
    path: '/simulation-system/economy/levels',
    description: 'Stamina cost and rewards per stage',
    color: '#52c41a',
  },
  {
    id: 'prestige',
    name: 'Prestige',
    nameEn: 'Prestige',
    icon: <StarOutlined />,
    path: '/simulation-system/economy/prestige',
    description: 'Rank progression, prestige accrual, and daily income',
    color: '#eb2f96',
  },
  {
    id: 'calculator',
    name: 'Calculator',
    nameEn: 'Calculator',
    icon: <ExperimentOutlined />,
    path: '/simulation-system/economy/calculator',
    description: 'Combined income and growth planning',
    color: '#13c2c2',
  },
] as const;

/** Battle simulator module cards (hub). */
const BATTLE_MODULES = [
  {
    id: 'battle-simulator',
    name: 'Battle Simulator',
    nameEn: 'Battle Simulator',
    icon: <ThunderboltOutlined />,
    path: '/simulation-system/battle',
    description: 'Turn-based PVE battle simulation and difficulty checks',
    color: '#fa541c',
  },
  {
    id: 'battle-skills',
    name: 'Battle Skills',
    nameEn: 'Battle Skills',
    icon: <SettingOutlined />,
    path: '/simulation-system/battle/skills',
    description: 'Edit battle skills locally in the browser for the simulator',
    color: '#722ed1',
  },
  {
    id: 'battle-studio-libraries',
    name: 'Project tables (Studio)',
    nameEn: 'Project tables (Studio)',
    icon: <TableOutlined />,
    path: '/simulation-system/battle/studio-libraries',
    description: 'Embed Keco Studio project libraries: same UI as Studio for new tables and references',
    color: '#531dab',
  },
  {
    id: 'battle-local-tables',
    name: 'Local tables',
    nameEn: 'Local tables',
    icon: <TableOutlined />,
    path: '/simulation-system/battle/local-tables',
    description: 'Simulation-only IndexedDB tables; reference Studio libraries with gated write-back',
    color: '#237804',
  },
] as const;

/** Simulation hub: entry to economy and battle tools. */
export default function SimulationSystemPage() {
  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.headerIcon} aria-hidden>
            <ExperimentOutlined />
          </span>
          <div className={styles.headerTitle}>
            <h1>Simulation System</h1>
            <p>Economy and battle tooling</p>
          </div>
        </div>
        <Badge status="processing" text="Design-time simulators" />
        <Link href="/projects" className={styles.backButton}>
          Back to projects
        </Link>
      </header>

      <main className={styles.mainContent}>
        <section className={styles.content}>
          <Card className={styles.introCard} variant="borderless">
            <div className={styles.introHeader}>
              <span className={styles.introIcon} style={{ color: '#722ed1' }} aria-hidden>
                <ExperimentOutlined />
              </span>
              <div className={styles.introTitle}>
                <h2>Simulation System</h2>
                <p>Economy and battle</p>
              </div>
            </div>
            <p className={styles.introDesc}>
              Reference data and formulas inspired by mobile RPG progression loops; used for offline planning and balance checks.
            </p>
          </Card>

          <div className={styles.systemGrid}>
            <Link href="/simulation-system/battle" className={styles.systemCard}>
              <div className={styles.systemCardIcon} style={{ backgroundColor: '#fa541c' }}>
                <ThunderboltOutlined />
              </div>
              <div className={styles.systemCardContent}>
                <div className={styles.systemCardTitle}>Battle simulator</div>
                <div className={styles.systemCardDesc}>
                  Turn-based PVE combat with batch runs and automated difficulty hints
                </div>
              </div>
            </Link>

            <Link href="/simulation-system/battle/skills" className={styles.systemCard}>
              <div className={styles.systemCardIcon} style={{ backgroundColor: '#531dab' }}>
                <SettingOutlined />
              </div>
              <div className={styles.systemCardContent}>
                <div className={styles.systemCardTitle}>Battle skills</div>
                <div className={styles.systemCardDesc}>
                  Edit skills locally; the battle simulator reads your saved sheet
                </div>
              </div>
            </Link>

            <Link href="/simulation-system/battle/studio-libraries" className={styles.systemCard}>
              <div className={styles.systemCardIcon} style={{ backgroundColor: '#722ed1' }}>
                <TableOutlined />
              </div>
              <div className={styles.systemCardContent}>
                <div className={styles.systemCardTitle}>Project tables (Studio)</div>
                <div className={styles.systemCardDesc}>
                  Same Keco Studio library UI in an embed; set NEXT_PUBLIC_KECO_STUDIO_ORIGIN and pick a project
                </div>
              </div>
            </Link>

            <Link href="/simulation-system/battle/local-tables" className={styles.systemCard}>
              <div className={styles.systemCardIcon} style={{ backgroundColor: '#237804' }}>
                <TableOutlined />
              </div>
              <div className={styles.systemCardContent}>
                <div className={styles.systemCardTitle}>Local tables</div>
                <div className={styles.systemCardDesc}>
                  IndexedDB tables in this app; reference Studio libraries with online + role write-back queue
                </div>
              </div>
            </Link>

            <Link href="/simulation-system/economy/overview" className={styles.systemCard}>
              <div className={styles.systemCardIcon} style={{ backgroundColor: '#722ed1' }}>
                <DollarOutlined />
              </div>
              <div className={styles.systemCardContent}>
                <div className={styles.systemCardTitle}>Economy simulator</div>
                <div className={styles.systemCardDesc}>
                  Characters, equipment, arena, stages, prestige, and aggregate income
                </div>
              </div>
            </Link>

            <Link href="/simulation-system/progression" className={styles.systemCard}>
              <div className={styles.systemCardIcon} style={{ backgroundColor: '#13c2c2' }}>
                <RiseOutlined />
              </div>
              <div className={styles.systemCardContent}>
                <div className={styles.systemCardTitle}>成长 / 反馈模拟器</div>
                <div className={styles.systemCardDesc}>
                  通用「付出→反馈」引擎：经验、技能熟练度、挂机时长奖励等
                </div>
              </div>
            </Link>
          </div>

          <div className={styles.moduleGrid}>
            {BATTLE_MODULES.map((module) => (
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
            {ECONOMY_MODULES.map((module) => (
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
            <h3 className={styles.infoTitle}>System info</h3>
            <div className={styles.infoContent}>
              <p>
                These tools approximate in-game economy and combat loops for spreadsheet-style analysis. They are not
                connected to a live game server.
              </p>
              <ul className={styles.infoList}>
                <li>
                  <strong>Battle simulator:</strong> turn-based PVE, batch runs, and difficulty-oriented metrics
                </li>
                <li>
                  <strong>Characters:</strong> base stats, rarity, factions, and growth knobs used by the economy views
                </li>
                <li>
                  <strong>Equipment:</strong> enhancement costs, crafting, and quality scaling
                </li>
                <li>
                  <strong>Arena:</strong> daily rewards and prestige from rank
                </li>
                <li>
                  <strong>Levels:</strong> stamina spend versus rewards
                </li>
                <li>
                  <strong>Prestige:</strong> rank requirements, decay, and daily accrual
                </li>
              </ul>
            </div>
          </Card>
        </section>
      </main>
    </div>
  );
}
