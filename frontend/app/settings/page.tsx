'use client';

import { useDetectionSettingsStore, DetectionType } from '@/stores/detectionSettingsStore';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';

interface ToggleProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

function Toggle({ label, description, checked, onChange }: ToggleProps) {
  return (
    <div className="flex items-center justify-between py-3">
      <div>
        <span className="text-sm font-medium text-[var(--color-text-primary)]">{label}</span>
        {description && (
          <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{description}</p>
        )}
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          checked ? 'bg-[var(--color-primary)]' : 'bg-gray-300'
        }`}
        role="switch"
        aria-checked={checked}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
}

interface SettingsSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
}

function SettingsSection({ title, description, children }: SettingsSectionProps) {
  return (
    <div className="mb-6">
      <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-[var(--color-text-secondary)] mb-4">{description}</p>
      )}
      <div className="divide-y divide-[var(--color-border)]">{children}</div>
    </div>
  );
}

export default function SettingsPage() {
  const visibility = useDetectionSettingsStore((state) => state.visibility);
  const setVisibility = useDetectionSettingsStore((state) => state.setVisibility);
  const resetToDefaults = useDetectionSettingsStore((state) => state.resetToDefaults);

  const handleToggle = (type: DetectionType) => (checked: boolean) => {
    setVisibility(type, checked);
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg-secondary)]">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">Settings</h1>
          <p className="text-[var(--color-text-secondary)] mt-1">
            Configure which detection types are shown in analysis results
          </p>
        </div>

        <Card variant="default" padding="lg">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">
              Detection Visibility
            </h2>
            <Button variant="ghost" size="sm" onClick={resetToDefaults}>
              Reset to Defaults
            </Button>
          </div>

          <SettingsSection
            title="Roof Damage"
            description="Damage types detected on roofs and structures"
          >
            <Toggle
              label="Hail Damage"
              description="Impact marks and dents from hail"
              checked={visibility.hail_damage}
              onChange={handleToggle('hail_damage')}
            />
            <Toggle
              label="Wind/Storm Damage"
              description="Lifted, curled, or displaced materials from wind"
              checked={visibility.wind_damage}
              onChange={handleToggle('wind_damage')}
            />
            <Toggle
              label="Missing Shingles"
              description="Gaps where shingles have been removed or lost"
              checked={visibility.missing_shingles}
              onChange={handleToggle('missing_shingles')}
            />
          </SettingsSection>

          <SettingsSection
            title="Construction Materials"
            description="Packaged and discrete building materials"
          >
            <Toggle
              label="Shingles"
              description="Shingle bundles and roofing materials"
              checked={visibility.shingles}
              onChange={handleToggle('shingles')}
            />
            <Toggle
              label="Plywood"
              description="Plywood sheets and decking materials"
              checked={visibility.plywood}
              onChange={handleToggle('plywood')}
            />
          </SettingsSection>

          <SettingsSection
            title="Loose Materials"
            description="Bulk materials with volume estimation"
          >
            <Toggle
              label="Gravel"
              description="Gravel piles and aggregate"
              checked={visibility.gravel}
              onChange={handleToggle('gravel')}
            />
            <Toggle
              label="Mulch"
              description="Mulch and wood chip piles"
              checked={visibility.mulch}
              onChange={handleToggle('mulch')}
            />
            <Toggle
              label="Sand"
              description="Sand piles and fill sand"
              checked={visibility.sand}
              onChange={handleToggle('sand')}
            />
            <Toggle
              label="Dirt"
              description="Dirt and fill material piles"
              checked={visibility.dirt}
              onChange={handleToggle('dirt')}
            />
            <Toggle
              label="Topsoil"
              description="Topsoil and landscaping soil"
              checked={visibility.topsoil}
              onChange={handleToggle('topsoil')}
            />
            <Toggle
              label="Stone"
              description="Stone and rock piles"
              checked={visibility.stone}
              onChange={handleToggle('stone')}
            />
          </SettingsSection>

          <SettingsSection
            title="Other Detections"
            description="Objects not specifically defined in the system"
          >
            <Toggle
              label="Other Identified Objects"
              description="Sky, roads, trees, vehicles, and other non-construction items"
              checked={visibility.other}
              onChange={handleToggle('other')}
            />
          </SettingsSection>
        </Card>
      </div>
    </div>
  );
}
