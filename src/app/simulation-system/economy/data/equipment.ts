/**
 * Equipment data — reference costs and unlock levels.
 */

import type { Equipment, EquipmentQuality, EquipmentSlot } from '../types';

/**
 * Parse a CSV row into an equipment object
 */
function parseEquipmentRow(row: string[]): Equipment | null {
  if (!row[0] || !row[1]) return null;
  
  const id = parseFloat(row[0]);
  if (isNaN(id)) return null;
  
  const name = row[1];
  const mainType = parseFloat(row[2]) || 0;
  const subType = parseFloat(row[3]) || 0;
  const level = parseFloat(row[4]) || 0;
  const quality = parseFloat(row[5]) || 1;
  
  // Column 14: per-level enhance cost (ascending); column 19: silver per socket —
  // values like 328,355,384 are the authoritative per-level enhance costs
  const enhanceCost = parseFloat(row[14]) || 0;
  
  // Craft silver cost
  const craftCost = parseFloat(row[23]) || 0;
  
  // Unlock level
  const openLevel = parseFloat(row[11]) || 0;
  
  // Quality label
  let qualityText: EquipmentQuality = 'Normal';
  if (row[24]) {
    switch (row[24]) {
      case 'Normal':
        qualityText = 'Normal';
        break;
      case 'Advanced':
        qualityText = 'Advanced';
        break;
      case 'Mythic':
        qualityText = 'Mythic';
        break;
    }
  } else if (quality === 6 || quality === 7) {
    qualityText = 'Mythic';
  } else if (quality >= 4) {
    qualityText = 'Advanced';
  }
  
  return {
    id,
    name,
    mainType,
    subType,
    level,
    quality,
    qualityText,
    enhanceCost,
    craftCost,
    openLevel,
  };
}

// Equipment data — key items from CSV
export const EQUIPMENTS: Equipment[] = [
  // Ornament series (Lv.1) — enhance cost ramp 328–567
  { id: 14200001, name: 'Ornament Kunai', mainType: 2, subType: 1, level: 1, quality: 1, qualityText: 'Normal', enhanceCost: 328, craftCost: 1500, openLevel: 30 },
  { id: 14200002, name: 'Ornament Shuriken', mainType: 2, subType: 1, level: 1, quality: 1, qualityText: 'Normal', enhanceCost: 355, craftCost: 1500, openLevel: 30 },
  { id: 14200003, name: 'Ornament Scroll', mainType: 2, subType: 1, level: 1, quality: 1, qualityText: 'Normal', enhanceCost: 384, craftCost: 2500, openLevel: 30 },
  { id: 14200004, name: 'Ornament Headband', mainType: 2, subType: 2, level: 1, quality: 1, qualityText: 'Normal', enhanceCost: 415, craftCost: 2500, openLevel: 30 },
  { id: 14200005, name: 'Ornament Chestplate', mainType: 2, subType: 3, level: 1, quality: 1, qualityText: 'Normal', enhanceCost: 448, craftCost: 4000, openLevel: 30 },
  { id: 14200006, name: 'Ornament Cloak', mainType: 2, subType: 4, level: 1, quality: 1, qualityText: 'Normal', enhanceCost: 484, craftCost: 4000, openLevel: 30 },
  { id: 14200007, name: 'Ornament Boots', mainType: 2, subType: 5, level: 1, quality: 1, qualityText: 'Normal', enhanceCost: 524, craftCost: 4000, openLevel: 30 },
  { id: 14200008, name: 'Ornament Belt', mainType: 2, subType: 6, level: 1, quality: 1, qualityText: 'Normal', enhanceCost: 567, craftCost: 6000, openLevel: 30 },

  // Genin series (Lv.1)
  { id: 14200011, name: 'Genin Kunai', mainType: 2, subType: 1, level: 1, quality: 1, qualityText: 'Normal', enhanceCost: 613, craftCost: 6000, openLevel: 65 },
  { id: 14200012, name: 'Genin Shuriken', mainType: 2, subType: 1, level: 1, quality: 1, qualityText: 'Normal', enhanceCost: 662, craftCost: 6000, openLevel: 65 },
  { id: 14200013, name: 'Genin Scroll', mainType: 2, subType: 1, level: 1, quality: 1, qualityText: 'Normal', enhanceCost: 716, craftCost: 6000, openLevel: 65 },
  { id: 14200014, name: 'Genin Headband', mainType: 2, subType: 2, level: 1, quality: 1, qualityText: 'Normal', enhanceCost: 774, craftCost: 8000, openLevel: 65 },
  { id: 14200015, name: 'Genin Chestplate', mainType: 2, subType: 3, level: 1, quality: 1, qualityText: 'Normal', enhanceCost: 836, craftCost: 8000, openLevel: 65 },
  { id: 14200016, name: 'Genin Cloak', mainType: 2, subType: 4, level: 1, quality: 1, qualityText: 'Normal', enhanceCost: 903, craftCost: 10000, openLevel: 65 },
  { id: 14200017, name: 'Genin Boots', mainType: 2, subType: 5, level: 1, quality: 1, qualityText: 'Normal', enhanceCost: 976, craftCost: 10000, openLevel: 65 },
  { id: 14200018, name: 'Genin Belt', mainType: 2, subType: 6, level: 1, quality: 1, qualityText: 'Normal', enhanceCost: 1056, craftCost: 10000, openLevel: 65 },

  // Refined series (Lv.10)
  { id: 14200021, name: 'Refined Kunai', mainType: 2, subType: 1, level: 10, quality: 2, qualityText: 'Advanced', enhanceCost: 1141, craftCost: 12000, openLevel: 75 },
  { id: 14200022, name: 'Refined Shuriken', mainType: 2, subType: 1, level: 10, quality: 2, qualityText: 'Advanced', enhanceCost: 1233, craftCost: 12000, openLevel: 75 },
  { id: 14200025, name: 'Refined Chestplate', mainType: 2, subType: 3, level: 10, quality: 2, qualityText: 'Advanced', enhanceCost: 1555, craftCost: 12000, openLevel: 78 },
  { id: 14200026, name: 'Refined Cloak', mainType: 2, subType: 4, level: 10, quality: 2, qualityText: 'Advanced', enhanceCost: 1680, craftCost: 14000, openLevel: 78 },
  { id: 14200027, name: 'Refined Boots', mainType: 2, subType: 5, level: 10, quality: 2, qualityText: 'Advanced', enhanceCost: 1814, craftCost: 16000, openLevel: 78 },
  { id: 14200028, name: 'Refined Belt', mainType: 2, subType: 6, level: 10, quality: 2, qualityText: 'Advanced', enhanceCost: 1959, craftCost: 14000, openLevel: 78 },

  // Snowclarity series (Lv.30)
  { id: 14200031, name: 'Snowclarity Kunai', mainType: 2, subType: 1, level: 30, quality: 3, qualityText: 'Advanced', enhanceCost: 2116, craftCost: 16000, openLevel: 80 },
  { id: 14200032, name: 'Snowclarity Shuriken', mainType: 2, subType: 1, level: 30, quality: 3, qualityText: 'Advanced', enhanceCost: 2287, craftCost: 16000, openLevel: 80 },
  { id: 14200035, name: 'Snowclarity Chestplate', mainType: 2, subType: 3, level: 30, quality: 3, qualityText: 'Advanced', enhanceCost: 2882, craftCost: 20000, openLevel: 85 },
  { id: 14200036, name: 'Snowclarity Cloak', mainType: 2, subType: 4, level: 30, quality: 3, qualityText: 'Advanced', enhanceCost: 3114, craftCost: 14000, openLevel: 85 },
  { id: 14200037, name: 'Snowclarity Boots', mainType: 2, subType: 5, level: 30, quality: 3, qualityText: 'Advanced', enhanceCost: 3363, craftCost: 16000, openLevel: 85 },
  { id: 14200038, name: 'Snowclarity Belt', mainType: 2, subType: 6, level: 30, quality: 3, qualityText: 'Advanced', enhanceCost: 3633, craftCost: 18000, openLevel: 85 },

  // Emberend series (Lv.30)
  { id: 14200041, name: 'Emberend Kunai', mainType: 2, subType: 1, level: 30, quality: 4, qualityText: 'Advanced', enhanceCost: 3925, craftCost: 0, openLevel: 90 },
  { id: 14200042, name: 'Emberend Shuriken', mainType: 2, subType: 1, level: 30, quality: 4, qualityText: 'Advanced', enhanceCost: 4869, craftCost: 0, openLevel: 90 },
  { id: 14200045, name: 'Emberend Chestplate', mainType: 2, subType: 3, level: 30, quality: 4, qualityText: 'Advanced', enhanceCost: 7656, craftCost: 0, openLevel: 95 },
  { id: 14200046, name: 'Emberend Cloak', mainType: 2, subType: 4, level: 30, quality: 4, qualityText: 'Advanced', enhanceCost: 8577, craftCost: 0, openLevel: 95 },
  { id: 14200047, name: 'Emberend Boots', mainType: 2, subType: 5, level: 30, quality: 4, qualityText: 'Advanced', enhanceCost: 9496, craftCost: 0, openLevel: 95 },
  { id: 14200048, name: 'Emberend Belt', mainType: 2, subType: 6, level: 30, quality: 4, qualityText: 'Advanced', enhanceCost: 10416, craftCost: 0, openLevel: 95 },

  // Mistveil series (Lv.50)
  { id: 14200051, name: 'Mistveil Kunai', mainType: 2, subType: 1, level: 50, quality: 3, qualityText: 'Advanced', enhanceCost: 11335, craftCost: 0, openLevel: 98 },
  { id: 14200052, name: 'Mistveil Shuriken', mainType: 2, subType: 1, level: 50, quality: 3, qualityText: 'Advanced', enhanceCost: 12260, craftCost: 0, openLevel: 98 },
  { id: 14200055, name: 'Mistveil Chestplate', mainType: 2, subType: 3, level: 50, quality: 3, qualityText: 'Advanced', enhanceCost: 15070, craftCost: 0, openLevel: 100 },
  { id: 14200056, name: 'Mistveil Cloak', mainType: 2, subType: 4, level: 50, quality: 3, qualityText: 'Advanced', enhanceCost: 16024, craftCost: 0, openLevel: 100 },
  { id: 14200057, name: 'Mistveil Boots', mainType: 2, subType: 5, level: 50, quality: 3, qualityText: 'Advanced', enhanceCost: 16986, craftCost: 0, openLevel: 100 },
  { id: 14200058, name: 'Mistveil Belt', mainType: 2, subType: 6, level: 50, quality: 3, qualityText: 'Advanced', enhanceCost: 17960, craftCost: 0, openLevel: 100 },

  // Moonwell series (Lv.50)
  { id: 14200061, name: 'Moonwell Kunai', mainType: 2, subType: 1, level: 50, quality: 4, qualityText: 'Advanced', enhanceCost: 18943, craftCost: 0, openLevel: 105 },
  { id: 14200062, name: 'Moonwell Shuriken', mainType: 2, subType: 1, level: 50, quality: 4, qualityText: 'Advanced', enhanceCost: 19940, craftCost: 0, openLevel: 105 },
  { id: 14200065, name: 'Moonwell Chestplate', mainType: 2, subType: 3, level: 50, quality: 4, qualityText: 'Advanced', enhanceCost: 23932, craftCost: 0, openLevel: 110 },
  { id: 14200066, name: 'Moonwell Cloak', mainType: 2, subType: 4, level: 50, quality: 4, qualityText: 'Advanced', enhanceCost: 25514, craftCost: 0, openLevel: 110 },
  { id: 14200067, name: 'Moonwell Boots', mainType: 2, subType: 5, level: 50, quality: 4, qualityText: 'Advanced', enhanceCost: 27159, craftCost: 0, openLevel: 110 },
  { id: 14200068, name: 'Moonwell Belt', mainType: 2, subType: 6, level: 50, quality: 4, qualityText: 'Advanced', enhanceCost: 28860, craftCost: 0, openLevel: 110 },
  
  // Heretic Fuma series (Lv.75)
  { id: 14210081, name: 'Heretic Fuma Kunai', mainType: 2, subType: 1, level: 75, quality: 7, qualityText: 'Mythic', enhanceCost: 4906, craftCost: 0, openLevel: 0 },
  { id: 14210082, name: 'Heretic Fuma Shuriken', mainType: 2, subType: 1, level: 75, quality: 7, qualityText: 'Mythic', enhanceCost: 6087, craftCost: 0, openLevel: 0 },
  { id: 14210083, name: 'Heretic Fuma Scroll', mainType: 2, subType: 1, level: 75, quality: 7, qualityText: 'Mythic', enhanceCost: 7255, craftCost: 0, openLevel: 0 },
  { id: 14210084, name: 'Heretic Fuma Headband', mainType: 2, subType: 2, level: 75, quality: 7, qualityText: 'Mythic', enhanceCost: 8415, craftCost: 0, openLevel: 0 },
  { id: 14210085, name: 'Heretic Fuma Chestplate', mainType: 2, subType: 3, level: 75, quality: 7, qualityText: 'Mythic', enhanceCost: 9570, craftCost: 0, openLevel: 0 },
  { id: 14210086, name: 'Heretic Fuma Cloak', mainType: 2, subType: 4, level: 75, quality: 7, qualityText: 'Mythic', enhanceCost: 10722, craftCost: 0, openLevel: 0 },
  { id: 14210087, name: 'Heretic Fuma Boots', mainType: 2, subType: 5, level: 75, quality: 7, qualityText: 'Mythic', enhanceCost: 11871, craftCost: 0, openLevel: 0 },

  // Seal Moon series (Lv.85)
  { id: 14210091, name: 'Seal Moon Kunai', mainType: 2, subType: 1, level: 85, quality: 7, qualityText: 'Mythic', enhanceCost: 14169, craftCost: 0, openLevel: 0 },
  { id: 14210092, name: 'Seal Moon Shuriken', mainType: 2, subType: 1, level: 85, quality: 7, qualityText: 'Mythic', enhanceCost: 15325, craftCost: 0, openLevel: 0 },
  { id: 14210093, name: 'Seal Moon Scroll', mainType: 2, subType: 1, level: 85, quality: 7, qualityText: 'Mythic', enhanceCost: 16492, craftCost: 0, openLevel: 0 },
  { id: 14210094, name: 'Seal Moon Headband', mainType: 2, subType: 2, level: 85, quality: 7, qualityText: 'Mythic', enhanceCost: 17659, craftCost: 0, openLevel: 0 },
  { id: 14210095, name: 'Seal Moon Chestplate', mainType: 2, subType: 3, level: 85, quality: 7, qualityText: 'Mythic', enhanceCost: 18838, craftCost: 0, openLevel: 0 },
  { id: 14210096, name: 'Seal Moon Cloak', mainType: 2, subType: 4, level: 85, quality: 7, qualityText: 'Mythic', enhanceCost: 20031, craftCost: 0, openLevel: 0 },
  { id: 14210097, name: 'Seal Moon Boots', mainType: 2, subType: 5, level: 85, quality: 7, qualityText: 'Mythic', enhanceCost: 21232, craftCost: 0, openLevel: 0 },
  { id: 14210098, name: 'Seal Moon Belt', mainType: 2, subType: 6, level: 85, quality: 7, qualityText: 'Mythic', enhanceCost: 22450, craftCost: 0, openLevel: 0 },

  // Asura Jizo series (Lv.95)
  { id: 14210101, name: 'Asura Jizo Kunai', mainType: 2, subType: 1, level: 95, quality: 7, qualityText: 'Mythic', enhanceCost: 23679, craftCost: 0, openLevel: 0 },
  { id: 14210102, name: 'Asura Jizo Shuriken', mainType: 2, subType: 1, level: 95, quality: 7, qualityText: 'Mythic', enhanceCost: 24925, craftCost: 0, openLevel: 0 },
  { id: 14210103, name: 'Asura Jizo Scroll', mainType: 2, subType: 1, level: 95, quality: 7, qualityText: 'Mythic', enhanceCost: 26185, craftCost: 0, openLevel: 0 },
  { id: 14210104, name: 'Asura Jizo Headband', mainType: 2, subType: 2, level: 95, quality: 7, qualityText: 'Mythic', enhanceCost: 28021, craftCost: 0, openLevel: 0 },
  { id: 14210105, name: 'Asura Jizo Chestplate', mainType: 2, subType: 3, level: 95, quality: 7, qualityText: 'Mythic', enhanceCost: 29916, craftCost: 0, openLevel: 0 },
  { id: 14210106, name: 'Asura Jizo Cloak', mainType: 2, subType: 4, level: 95, quality: 7, qualityText: 'Mythic', enhanceCost: 31893, craftCost: 0, openLevel: 0 },
  { id: 14210107, name: 'Asura Jizo Boots', mainType: 2, subType: 5, level: 95, quality: 7, qualityText: 'Mythic', enhanceCost: 33949, craftCost: 0, openLevel: 0 },
  { id: 14210108, name: 'Asura Jizo Belt', mainType: 2, subType: 6, level: 95, quality: 7, qualityText: 'Mythic', enhanceCost: 36075, craftCost: 0, openLevel: 0 },

  // Demonrealm series (Lv.10)
  { id: 14220011, name: 'Demonrealm Kunai', mainType: 2, subType: 1, level: 10, quality: 7, qualityText: 'Mythic', enhanceCost: 38283, craftCost: 0, openLevel: 0 },
  { id: 14220012, name: 'Demonrealm Shuriken', mainType: 2, subType: 1, level: 10, quality: 7, qualityText: 'Mythic', enhanceCost: 40585, craftCost: 0, openLevel: 0 },
  { id: 14220013, name: 'Demonrealm Scroll', mainType: 2, subType: 1, level: 10, quality: 7, qualityText: 'Mythic', enhanceCost: 42963, craftCost: 0, openLevel: 0 },
  { id: 14220014, name: 'Demonrealm Headband', mainType: 2, subType: 2, level: 10, quality: 7, qualityText: 'Mythic', enhanceCost: 46015, craftCost: 0, openLevel: 0 },
  { id: 14220015, name: 'Demonrealm Chestplate', mainType: 2, subType: 3, level: 10, quality: 7, qualityText: 'Mythic', enhanceCost: 49200, craftCost: 0, openLevel: 0 },
  { id: 14220016, name: 'Demonrealm Cloak', mainType: 2, subType: 4, level: 10, quality: 7, qualityText: 'Mythic', enhanceCost: 52492, craftCost: 0, openLevel: 0 },
  { id: 14220017, name: 'Demonrealm Boots', mainType: 2, subType: 5, level: 10, quality: 7, qualityText: 'Mythic', enhanceCost: 55923, craftCost: 0, openLevel: 0 },
  { id: 14220018, name: 'Demonrealm Belt', mainType: 2, subType: 6, level: 10, quality: 7, qualityText: 'Mythic', enhanceCost: 59481, craftCost: 0, openLevel: 0 },

  // Mirror Moon series (Lv.78)
  { id: 14220081, name: 'Mirror Moon Breaker Kunai', mainType: 2, subType: 1, level: 78, quality: 7, qualityText: 'Mythic', enhanceCost: 63172, craftCost: 0, openLevel: 0 },
  { id: 14220082, name: 'Mirror Moon Breaker Shuriken', mainType: 2, subType: 1, level: 78, quality: 7, qualityText: 'Mythic', enhanceCost: 66997, craftCost: 0, openLevel: 0 },
  { id: 14220083, name: 'Mirror Moon Breaker Scroll', mainType: 2, subType: 1, level: 78, quality: 7, qualityText: 'Mythic', enhanceCost: 70977, craftCost: 0, openLevel: 0 },
  { id: 14220084, name: 'Mirror Moon Breaker Headband', mainType: 2, subType: 2, level: 78, quality: 7, qualityText: 'Mythic', enhanceCost: 75114, craftCost: 0, openLevel: 0 },
  { id: 14220085, name: 'Mirror Moon Breaker Chestplate', mainType: 2, subType: 3, level: 78, quality: 7, qualityText: 'Mythic', enhanceCost: 79398, craftCost: 0, openLevel: 0 },
  { id: 14220086, name: 'Mirror Moon Breaker Cloak', mainType: 2, subType: 4, level: 78, quality: 7, qualityText: 'Mythic', enhanceCost: 84939, craftCost: 0, openLevel: 0 },
  { id: 14220087, name: 'Mirror Moon Breaker Boots', mainType: 2, subType: 5, level: 78, quality: 7, qualityText: 'Mythic', enhanceCost: 90702, craftCost: 0, openLevel: 0 },
  { id: 14220088, name: 'Mirror Moon Breaker Belt', mainType: 2, subType: 6, level: 78, quality: 7, qualityText: 'Mythic', enhanceCost: 96693, craftCost: 0, openLevel: 0 },

  // Bloodrealm series (Lv.98)
  { id: 14220101, name: 'Bloodrealm Breaker Kunai', mainType: 2, subType: 1, level: 98, quality: 7, qualityText: 'Mythic', enhanceCost: 102921, craftCost: 0, openLevel: 0 },
  { id: 14220102, name: 'Bloodrealm Breaker Shuriken', mainType: 2, subType: 1, level: 98, quality: 7, qualityText: 'Mythic', enhanceCost: 109369, craftCost: 0, openLevel: 0 },
  { id: 14220103, name: 'Bloodrealm Breaker Scroll', mainType: 2, subType: 1, level: 98, quality: 7, qualityText: 'Mythic', enhanceCost: 116067, craftCost: 0, openLevel: 0 },
  { id: 14220104, name: 'Bloodrealm Breaker Headband', mainType: 2, subType: 2, level: 98, quality: 7, qualityText: 'Mythic', enhanceCost: 123018, craftCost: 0, openLevel: 0 },
  { id: 14220105, name: 'Bloodrealm Breaker Chestplate', mainType: 2, subType: 3, level: 98, quality: 7, qualityText: 'Mythic', enhanceCost: 130252, craftCost: 0, openLevel: 0 },
  { id: 14220106, name: 'Bloodrealm Breaker Cloak', mainType: 2, subType: 4, level: 98, quality: 7, qualityText: 'Mythic', enhanceCost: 137733, craftCost: 0, openLevel: 0 },
  { id: 14220107, name: 'Bloodrealm Breaker Boots', mainType: 2, subType: 5, level: 98, quality: 7, qualityText: 'Mythic', enhanceCost: 145488, craftCost: 0, openLevel: 0 },
  { id: 14220108, name: 'Bloodrealm Breaker Belt', mainType: 2, subType: 6, level: 98, quality: 7, qualityText: 'Mythic', enhanceCost: 153549, craftCost: 0, openLevel: 0 },

  // Heavenswrath series (Lv.118)
  { id: 14220121, name: 'Heavenswrath Breaker Kunai', mainType: 2, subType: 1, level: 118, quality: 7, qualityText: 'Mythic', enhanceCost: 162976, craftCost: 0, openLevel: 0 },
  { id: 14220122, name: 'Heavenswrath Breaker Shuriken', mainType: 2, subType: 1, level: 118, quality: 7, qualityText: 'Mythic', enhanceCost: 172683, craftCost: 0, openLevel: 0 },
  { id: 14220123, name: 'Heavenswrath Breaker Scroll', mainType: 2, subType: 1, level: 118, quality: 7, qualityText: 'Mythic', enhanceCost: 182619, craftCost: 0, openLevel: 0 },
  { id: 14220124, name: 'Heavenswrath Breaker Headband', mainType: 2, subType: 2, level: 118, quality: 7, qualityText: 'Mythic', enhanceCost: 192873, craftCost: 0, openLevel: 0 },
  { id: 14220125, name: 'Heavenswrath Breaker Chestplate', mainType: 2, subType: 3, level: 118, quality: 7, qualityText: 'Mythic', enhanceCost: 203395, craftCost: 0, openLevel: 0 },
  { id: 14220126, name: 'Heavenswrath Breaker Cloak', mainType: 2, subType: 4, level: 118, quality: 7, qualityText: 'Mythic', enhanceCost: 214218, craftCost: 0, openLevel: 0 },
  { id: 14220127, name: 'Heavenswrath Breaker Boots', mainType: 2, subType: 5, level: 118, quality: 7, qualityText: 'Mythic', enhanceCost: 225315, craftCost: 0, openLevel: 0 },
  { id: 14220128, name: 'Heavenswrath Breaker Belt', mainType: 2, subType: 6, level: 118, quality: 7, qualityText: 'Mythic', enhanceCost: 236757, craftCost: 0, openLevel: 0 },
];

/** Slot index to display label */
export const EQUIPMENT_SLOT_NAMES: Record<number, EquipmentSlot> = {
  1: 'Kunai',
  2: 'Headband',
  3: 'Chestplate',
  4: 'Cloak',
  5: 'Boots',
  6: 'Belt',
};

/** Equipment series names */
export const EQUIPMENT_SERIES: string[] = [
  'Ornament', 'Genin', 'Refined', 'Snowclarity', 'Emberend', 'Mistveil', 'Moonwell',
  'Sealmoon', 'Asura', 'Demonrealm', 'Mirrormoon', 'Bloodrealm', 'Heavenswrath', 'Myriad', 'Deity',
  'Violetdusk', 'Nightmare', 'Onimaru', 'Soulreap', 'Redoni', 'Mikazuki',
];

/**
 * Get equipment by id
 */
export function getEquipmentById(id: number): Equipment | undefined {
  return EQUIPMENTS.find(e => e.id === id);
}

/**
 * Get equipment by quality
 */
export function getEquipmentsByQuality(quality: number): Equipment[] {
  return EQUIPMENTS.filter(e => e.quality === quality);
}

/**
 * Get equipment by level
 */
export function getEquipmentsByLevel(level: number): Equipment[] {
  return EQUIPMENTS.filter(e => e.level <= level);
}

/**
 * Get equipment by slot
 */
export function getEquipmentsBySlot(slot: number): Equipment[] {
  return EQUIPMENTS.filter(e => e.subType === slot);
}

/**
 * Total enhance cost (piecewise curve by level)
 * Option B: lower multipliers for a more forgiving economy
 * 
 * Design:
 * 1. Low (1–30): ~baseCost × 1–3 per level
 * 2. Mid (31–70): ~baseCost × 3–5
 * 3. High (71–120): ~baseCost × 5–8
 * 4. Top (121+): ~baseCost × 8–12
 * 
 * @param baseLevel Current level
 * @param targetLevel Target level
 * @param baseCost Base per-level enhance cost from CSV
 */
export function calculateEnhanceCost(baseLevel: number, targetLevel: number, baseCost: number = 1000): number {
  // Default formula when base cost is missing
  if (baseCost <= 0) {
    baseCost = 1000;
  }
  
  let totalCost = 0;
  
  for (let lvl = baseLevel + 1; lvl <= targetLevel; lvl++) {
    // Piecewise curve per level (reduced multipliers)
    let levelCost: number;
    
    if (lvl <= 20) {
      // 1–20: logarithmic
      // Range: ~baseCost×1 to ×2
      levelCost = baseCost * (1 + 0.3 * Math.log(lvl + 1) / Math.log(21));
    } else if (lvl <= 50) {
      // 21–50: square root
      // Range: ~×2 to ×4
      levelCost = baseCost * (2 + 2 * Math.sqrt((lvl - 20) / 30));
    } else if (lvl <= 100) {
      // 51–100: sqrt + linear blend
      // Range: ~×4 to ×7
      levelCost = baseCost * (4 + 3 * Math.sqrt((lvl - 50) / 50));
    } else {
      // 100+: slower growth
      // Range: ~×7 to ×12
      levelCost = baseCost * (7 + 5 * Math.log((lvl - 99) + 1) / Math.log(101));
    }
    
    totalCost += Math.floor(levelCost);
  }
  
  return totalCost;
}

/**
 * Single-level enhance cost
 * @param level Target level
 * @param baseCost Base enhance cost
 */
export function calculateSingleLevelCost(level: number, baseCost: number = 1000): number {
  if (baseCost <= 0) baseCost = 1000;
  
  if (level <= 20) {
    return Math.floor(baseCost * (1 + 0.3 * Math.log(level + 1) / Math.log(21)));
  } else if (level <= 50) {
    return Math.floor(baseCost * (2 + 2 * Math.sqrt((level - 20) / 30)));
  } else if (level <= 100) {
    return Math.floor(baseCost * (4 + 3 * Math.sqrt((level - 50) / 50)));
  } else {
    return Math.floor(baseCost * (7 + 5 * Math.log((level - 99) + 1) / Math.log(101)));
  }
}

/**
 * Rough enhance cost estimate without summing every level.
 * For wide-range estimates
 */
export function estimateEnhanceCost(baseLevel: number, targetLevel: number, baseCost: number = 1000): number {
  if (baseCost <= 0) baseCost = 1000;
  const levels = targetLevel - baseLevel;
  
  // Midpoint level for average cost
  const midLevel = Math.floor((baseLevel + targetLevel) / 2);
  const avgCost = calculateSingleLevelCost(midLevel, baseCost);
  
  return Math.floor(avgCost * levels);
}

/**
 * Color token for quality tier
 */
export function getEquipmentQualityColor(quality: number): string {
  const colors: Record<number, string> = {
    1: '#8c8c8c', // normal
    2: '#52c41a', // advanced
    3: '#1890ff', // blue
    4: '#722ed1', // purple
    5: '#fa8c16', // orange
    6: '#f5222d', // red
    7: '#eb2f96', // pink
  };
  return colors[quality] || '#8c8c8c';
}
