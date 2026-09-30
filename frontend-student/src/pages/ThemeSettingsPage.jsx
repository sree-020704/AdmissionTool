import { useMemo, useState } from 'react';
import { Palette, RotateCcw, Check, ChevronDown, Sparkles } from 'lucide-react';
import { useTheme } from '@/theme/ThemeProvider';
import { TOKEN_CATEGORIES, CATEGORY_ORDER, CORE_TOKENS } from '@/theme/theme-tokens';
import { StudentLayout } from '@/components/StudentLayout';
import { cn } from '@/lib/utils';

function Card({ className, ...props }) {
  return <div className={cn('rounded-2xl border border-border bg-surface shadow-sm', className)} {...props} />;
}
function CardHeader({ className, ...props }) {
  return <div className={cn('flex flex-col gap-1.5 p-6', className)} {...props} />;
}
function CardTitle({ className, ...props }) {
  return <h3 className={cn('text-lg font-semibold tracking-tight text-heading', className)} {...props} />;
}
function CardDescription({ className, ...props }) {
  return <p className={cn('text-sm text-muted', className)} {...props} />;
}
function CardContent({ className, ...props }) {
  return <div className={cn('p-6 pt-0', className)} {...props} />;
}
function Button({ className, variant = 'default', disabled, ...props }) {
  const variants = {
    default: 'bg-gradient-to-r from-primary to-primary-hover text-white shadow-sm hover:opacity-95',
    outline: 'border border-input-border bg-white text-primary hover:bg-input-bg',
  };
  return (
    <button
      type="button"
      disabled={disabled}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 h-10 text-sm font-semibold transition-all duration-200 disabled:pointer-events-none disabled:opacity-50',
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}

function labelize(token) {
  return token
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function Swatch({ hex, onChange, size = 'md' }) {
  const dims = size === 'lg' ? 'h-11 w-11' : 'h-8 w-8';
  return (
    <span className={cn('relative inline-block shrink-0 overflow-hidden rounded-full border border-divider shadow-sm', dims)}>
      <span className="absolute inset-0" style={{ backgroundColor: hex }} />
      <input
        type="color"
        value={hex}
        onChange={(e) => onChange(e.target.value)}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        aria-label="Pick color"
      />
    </span>
  );
}

function PresetSwatch({ preset, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex flex-col items-center gap-2 rounded-2xl border px-3 py-3 text-center transition',
        active ? 'border-primary bg-input-bg shadow-sm' : 'border-divider bg-white hover:bg-input-bg',
      )}
    >
      <span
        className="flex h-10 w-10 items-center justify-center rounded-full border border-divider shadow-sm"
        style={{ backgroundColor: preset.primary }}
      >
        {active && <Check className="h-4 w-4 text-white drop-shadow" />}
      </span>
      <span className="text-xs font-semibold text-label">{preset.name}</span>
    </button>
  );
}

export function ThemeSettingsPage() {
  const { theme, presetId, isDefault, setPrimaryColor, applyPreset, setTokenColor, resetToDefault, makeCurrentTheDefault, presets } = useTheme();
  const [hexDraft, setHexDraft] = useState(theme.primary);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [openCategory, setOpenCategory] = useState('Brand & Primary');
  const [justSaved, setJustSaved] = useState(false);

  const grouped = useMemo(() => {
    const g = {};
    for (const [token, category] of Object.entries(TOKEN_CATEGORIES)) {
      if (!g[category]) g[category] = [];
      g[category].push(token);
    }
    return g;
  }, []);

  function handlePrimaryChange(hex) {
    setHexDraft(hex);
    setPrimaryColor(hex);
  }

  function handleSaveDefault() {
    makeCurrentTheDefault();
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 2000);
  }

  return (
    <StudentLayout>
    <div className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-input-bg text-primary">
          <Palette className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-heading">Theme &amp; Colors</h1>
          <p className="mt-1 text-sm text-label">
            Every color in the app — buttons, cards, badges, charts — is driven from here.
            Pick a primary color or a preset to recolor everything at once, or fine-tune
            individual colors below.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Primary color</CardTitle>
          <CardDescription>The whole palette is derived from this — every surface, border and status color shifts to stay in harmony.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-4">
          <Swatch hex={theme.primary} onChange={handlePrimaryChange} size="lg" />
          <input
            type="text"
            value={hexDraft}
            onChange={(e) => setHexDraft(e.target.value)}
            onBlur={() => /^#[0-9a-fA-F]{6}$/.test(hexDraft) && handlePrimaryChange(hexDraft)}
            onKeyDown={(e) => e.key === 'Enter' && /^#[0-9a-fA-F]{6}$/.test(hexDraft) && handlePrimaryChange(hexDraft)}
            className="h-10 w-32 rounded-xl border border-input-border bg-input-bg px-3 text-sm font-medium uppercase text-heading outline-none focus:border-mint focus:ring-2 focus:ring-mint/20"
            placeholder="#0A6640"
          />
          <span className="text-xs text-text-muted">Type a hex code, or use the swatch to pick visually.</span>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Presets</CardTitle>
          <CardDescription>One click to try a fully different look. &ldquo;Signature Emerald&rdquo; is this project&rsquo;s original theme.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
            {presets.map((preset) => (
              <PresetSwatch
                key={preset.id}
                preset={preset}
                active={presetId === preset.id}
                onClick={() => { applyPreset(preset); setHexDraft(preset.primary); }}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 py-5">
          <div>
            <p className="text-sm font-semibold text-heading">Make this my default theme</p>
            <p className="text-xs text-text-muted">Saves the current colors so they load automatically every time you open the app.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={resetToDefault} disabled={isDefault}>
              <RotateCcw className="h-4 w-4" /> Reset to original theme
            </Button>
            <Button onClick={handleSaveDefault}>
              {justSaved ? <Check className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
              {justSaved ? 'Saved' : 'Set as default'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <button
          type="button"
          onClick={() => setShowAdvanced((v) => !v)}
          className="flex w-full items-center justify-between px-6 py-5 text-left"
        >
          <div>
            <p className="text-sm font-semibold text-heading">Customize individual colors</p>
            <p className="text-xs text-text-muted">Fine-tune any of the {Object.keys(theme).length} colors that make up the theme.</p>
          </div>
          <ChevronDown className={cn('h-4 w-4 text-text-muted transition-transform', showAdvanced && 'rotate-180')} />
        </button>
        {showAdvanced && (
          <CardContent className="flex flex-col gap-2 pt-0">
            {CATEGORY_ORDER.filter((c) => grouped[c]?.length).map((category) => {
              const tokens = grouped[category].sort((a, b) => {
                const aCore = CORE_TOKENS.includes(a) ? 0 : 1;
                const bCore = CORE_TOKENS.includes(b) ? 0 : 1;
                return aCore - bCore || a.localeCompare(b);
              });
              const isOpen = openCategory === category;
              return (
                <div key={category} className="rounded-xl border border-divider">
                  <button
                    type="button"
                    onClick={() => setOpenCategory(isOpen ? null : category)}
                    className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-semibold text-heading"
                  >
                    <span className="flex items-center gap-2">
                      {category}
                      <span className="rounded-full bg-input-bg px-2 py-0.5 text-[10px] font-bold text-label">{tokens.length}</span>
                    </span>
                    <ChevronDown className={cn('h-4 w-4 text-text-muted transition-transform', isOpen && 'rotate-180')} />
                  </button>
                  {isOpen && (
                    <div className="grid grid-cols-1 gap-3 border-t border-divider p-4 sm:grid-cols-2">
                      {tokens.map((token) => (
                        <div key={token} className="flex items-center gap-3 rounded-lg bg-row-hover px-3 py-2">
                          <Swatch hex={theme[token]} onChange={(hex) => setTokenColor(token, hex)} />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-semibold text-heading">{labelize(token)}</p>
                            <input
                              type="text"
                              value={theme[token]}
                              onChange={(e) => setTokenColor(token, e.target.value)}
                              className="w-full bg-transparent text-xs uppercase text-text-muted outline-none"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        )}
      </Card>
    </div>
    </StudentLayout>
  );
}
