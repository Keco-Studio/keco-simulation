'use client';

import { useEffect } from 'react';
import { KECO_STUDIO_BATTLE_SKILL_MODULE_SYNC_MSG } from './battle/lib/skills/battleSkillsPersistenceKeys';

/**
 * When this app runs inside Keco Studio (iframe), the parent may send postMessages here.
 * Extend handlers as needed; unknown messages are ignored.
 */
export function SimulationStudioBridge() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const onMessage = (event: MessageEvent) => {
      if (event.source !== window.parent) return;
      const data = event.data;
      if (!data || typeof data !== 'object') return;

      if (data.type === KECO_STUDIO_BATTLE_SKILL_MODULE_SYNC_MSG) {
        // Reserved: sync battle skill modules from Studio into simulation storage when spec is defined.
        void data;
      }
    };

    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  return null;
}
