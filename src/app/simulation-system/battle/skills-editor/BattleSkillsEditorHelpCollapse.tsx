import { Collapse, Typography } from 'antd';
import styles from './BattleSkillsEditorHelpCollapse.module.css';

export function BattleSkillsEditorHelpCollapse() {
  return (
    <Collapse
      items={[
        {
          key: 'help',
          label: 'Field reference (optional fields use defaults)',
          children: (
            <Typography.Paragraph className={styles.helpParagraph} type="secondary">
              <ul className={styles.helpList}>
                <li>
                  Data is stored primarily in <strong>IndexedDB</strong> (similar to offline resource tables), with a{' '}
                  <strong>localStorage</strong> mirror for cross-tab sync.
                </li>
                <li>
                  <strong>Clear table</strong> saves an empty list: the battle page has no skills until you add rows
                  again or use <strong>Reset to built-in defaults</strong> (clears local storage).
                </li>
                <li>
                  <strong>Export / Import</strong> use <strong>Excel (.xlsx)</strong> with the same headers as Export;
                  import merges by <strong>id</strong> (existing id replaces the row, new ids append). Failed rows can be
                  downloaded as <strong>JSON</strong>.
                </li>
                <li>
                  The table and “+” share one horizontal scroll area; the <strong>horizontal scrollbar sits above the
                  pagination bar</strong>. Columns are not fixed so the add button stays visible.
                </li>
                <li>
                  <strong>Invalid rows are skipped</strong> (bad id/name, id format, etc.); when the same id appears
                  twice, <strong>only the first row is kept</strong>.
                </li>
                <li>
                  <strong>Reaction lines</strong> (optional): add element + reaction pairs for labels on battle skill
                  cards; no raw JSON. Live damage still follows <strong>attach element</strong> vs target aura.
                </li>
                <li>
                  <strong>id</strong>: unique key; letters, digits, underscore only (required).
                </li>
                <li>
                  <strong>name</strong>: display name (required).
                </li>
                <li>
                  <strong>type</strong>: usually <strong>attack</strong>; built-in healing uses <strong>special
                  effect</strong>.
                </li>
                <li>
                  <strong>power</strong>: multiplier on ATK; default 1.
                </li>
                <li>
                  <strong>MP / CD</strong>: default 0.
                </li>
                <li>
                  <strong>attach</strong>: choose <strong>None</strong> for no aura; after picking an element, strength
                  defaults to <strong>weak</strong> and duration follows the strength table (2 / 3 / 4) unless you
                  override.
                </li>
                <li>
                  <strong>DoT</strong>: both power and turns must be set to apply.
                </li>
                <li>
                  <strong>freeze turns</strong>: 0 means no freeze.
                </li>
                <li>
                  <strong>special</strong>: heal uses coef × ATK; debuffs use a ratio (e.g. 0.15 = 15%).
                </li>
              </ul>
            </Typography.Paragraph>
          ),
        },
      ]}
    />
  );
}
