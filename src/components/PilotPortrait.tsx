interface PilotPortraitProps {
  pilotId: string;
  faction?: 'player' | 'enemy';
  className?: string;
}

export function PilotPortrait({
  pilotId,
  faction = 'player',
  className = 'h-12 w-12',
}: PilotPortraitProps) {
  const isEnemy = faction === 'enemy';

  // 1. Ren Takahashi (Hot-blooded Super Robot ace: spiky navy hair, intense eyes, red/slate suit)
  if (pilotId === 'pilot_ren') {
    return (
      <svg
        viewBox="0 0 64 64"
        className={`rounded-lg border border-cyan-500/40 bg-slate-950 ${className}`}
        data-testid={`pilot-portrait-${pilotId}`}
        aria-label="Ren Takahashi"
      >
        <defs>
          <linearGradient id="renBg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#0c4a6e" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>
        </defs>
        <rect width="64" height="64" fill="url(#renBg)" />
        {/* Pilot Suit */}
        <path d="M12,64 C14,48 22,45 32,45 C42,45 50,48 52,64 Z" fill="#dc2626" />
        <path d="M24,46 L32,56 L40,46" fill="#0f172a" />
        {/* Neck & Face */}
        <rect x="28" y="38" width="8" height="9" fill="#fed7aa" />
        <path d="M20,24 C20,38 26,43 32,43 C38,43 44,38 44,24 C44,16 38,12 32,12 C26,12 20,16 20,24 Z" fill="#ffedd5" />
        {/* Spiky Anime Hair */}
        <path
          d="M17,27 L14,16 L22,18 L24,8 L31,14 L38,7 L40,16 L49,13 L46,26 L44,20 L38,24 L32,18 L26,24 L20,20 Z"
          fill="#1e293b"
        />
        {/* Determined Anime Eyes */}
        <polygon points="23,26 29,27 28,30 24,29" fill="#0f172a" />
        <circle cx="26.5" cy="28" r="1.1" fill="#38bdf8" />
        <polygon points="41,26 35,27 36,30 40,29" fill="#0f172a" />
        <circle cx="37.5" cy="28" r="1.1" fill="#38bdf8" />
        {/* Eyebrows & Confident Smirk */}
        <line x1="22" y1="23.5" x2="29" y2="25" stroke="#0f172a" strokeWidth="1.6" />
        <line x1="42" y1="23.5" x2="35" y2="25" stroke="#0f172a" strokeWidth="1.6" />
        <path d="M28,36 Q32,38 36,35.5" fill="none" stroke="#9a3412" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    );
  }

  // 2. Elena Vance (Real Robot ace: sleek silver-cyan hair, tactical headset, sharp blue eyes)
  if (pilotId === 'pilot_elena') {
    return (
      <svg
        viewBox="0 0 64 64"
        className={`rounded-lg border border-cyan-400/50 bg-slate-950 ${className}`}
        data-testid={`pilot-portrait-${pilotId}`}
        aria-label="Elena Vance"
      >
        <defs>
          <linearGradient id="elenaBg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#164e63" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>
        </defs>
        <rect width="64" height="64" fill="url(#elenaBg)" />
        {/* Back Hair */}
        <path d="M16,22 C15,38 18,48 22,52 L42,52 C46,48 49,38 48,22 Z" fill="#cbd5e1" />
        {/* Flight Suit */}
        <path d="M14,64 C16,49 23,46 32,46 C41,46 48,49 50,64 Z" fill="#f8fafc" />
        <path d="M25,46 L32,57 L39,46" fill="#06b6d4" />
        {/* Face */}
        <rect x="29" y="39" width="6" height="8" fill="#ffedd5" />
        <path d="M21,25 C21,37 26,42 32,42 C38,42 43,37 43,25 C43,17 38,13 32,13 C26,13 21,17 21,25 Z" fill="#fff7ed" />
        {/* Sleek Fringe */}
        <path d="M18,24 C19,12 26,9 32,9 C40,9 46,14 46,24 L41,18 L35,23 L30,17 L24,23 Z" fill="#e2e8f0" />
        {/* Tactical Headset */}
        <rect x="17" y="24" width="4" height="8" rx="1.5" fill="#06b6d4" />
        <path d="M19,31 Q23,36 28,36" fill="none" stroke="#22d3ee" strokeWidth="1.2" />
        {/* Sharp Anime Eyes */}
        <ellipse cx="26.5" cy="28" rx="2.6" ry="1.8" fill="#0f172a" />
        <circle cx="26.5" cy="28" r="1.2" fill="#22d3ee" />
        <ellipse cx="37.5" cy="28" rx="2.6" ry="1.8" fill="#0f172a" />
        <circle cx="37.5" cy="28" r="1.2" fill="#22d3ee" />
        <path d="M29,36 Q32,37 35,36" fill="none" stroke="#9a3412" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    );
  }

  // 3. Dr. Mina Aoki (Aegis-Medic pilot: glasses, emerald coat collar, calm smile)
  if (pilotId === 'pilot_mina') {
    return (
      <svg
        viewBox="0 0 64 64"
        className={`rounded-lg border border-emerald-400/50 bg-slate-950 ${className}`}
        data-testid={`pilot-portrait-${pilotId}`}
        aria-label="Dr. Mina Aoki"
      >
        <rect width="64" height="64" fill="#064e3b" />
        <path d="M16,22 C16,38 19,46 22,50 L42,50 C45,46 48,38 48,22 Z" fill="#1e293b" />
        <path d="M14,64 C16,49 23,46 32,46 C41,46 48,49 50,64 Z" fill="#ecfdf5" />
        <path d="M26,46 L32,56 L38,46" fill="#10b981" />
        <rect x="29" y="39" width="6" height="8" fill="#ffedd5" />
        <path d="M21,25 C21,37 26,42 32,42 C38,42 43,37 43,25 C43,17 38,13 32,13 C26,13 21,17 21,25 Z" fill="#ffedd5" />
        <path d="M19,24 C20,12 26,10 32,10 C39,10 45,14 45,24 L39,18 L32,21 L25,18 Z" fill="#0f172a" />
        {/* Glasses & Eyes */}
        <rect x="22.5" y="25.5" width="8" height="5" rx="1.5" fill="#10b981" fillOpacity="0.18" stroke="#34d399" strokeWidth="1.2" />
        <rect x="33.5" y="25.5" width="8" height="5" rx="1.5" fill="#10b981" fillOpacity="0.18" stroke="#34d399" strokeWidth="1.2" />
        <line x1="30.5" y1="28" x2="33.5" y2="28" stroke="#34d399" strokeWidth="1.2" />
        <circle cx="26.5" cy="28" r="1.4" fill="#0f172a" />
        <circle cx="37.5" cy="28" r="1.4" fill="#0f172a" />
        <path d="M28.5,35.5 Q32,38 35.5,35.5" fill="none" stroke="#9a3412" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
    );
  }

  // 4. Kai Sato (Support Mech pilot: goggles on forehead, confident look)
  if (pilotId === 'pilot_kai') {
    return (
      <svg
        viewBox="0 0 64 64"
        className={`rounded-lg border border-cyan-500/40 bg-slate-950 ${className}`}
        data-testid={`pilot-portrait-${pilotId}`}
        aria-label="Kai Sato"
      >
        <rect width="64" height="64" fill="#0f172a" />
        <path d="M13,64 C15,49 23,46 32,46 C41,46 49,49 51,64 Z" fill="#0284c7" />
        <rect x="28" y="38" width="8" height="9" fill="#fed7aa" />
        <path d="M21,25 C21,37 26,42 32,42 C38,42 43,37 43,25 C43,17 38,13 32,13 C26,13 21,17 21,25 Z" fill="#ffedd5" />
        <path d="M18,24 L20,12 L32,10 L44,12 L46,24 L39,19 L32,20 L25,19 Z" fill="#78350f" />
        {/* Tactical Goggles on Forehead */}
        <rect x="21" y="14" width="9" height="5" rx="2" fill="#22d3ee" stroke="#e2e8f0" strokeWidth="1" />
        <rect x="34" y="14" width="9" height="5" rx="2" fill="#22d3ee" stroke="#e2e8f0" strokeWidth="1" />
        <circle cx="26.5" cy="28" r="1.6" fill="#0f172a" />
        <circle cx="37.5" cy="28" r="1.6" fill="#0f172a" />
        <path d="M28,35.5 Q32,38 36,35.5" fill="none" stroke="#9a3412" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    );
  }

  // 5. Boss / Commander / Enemy AI Portraits
  if (pilotId === 'ai_boss_overlord' || pilotId === 'ai_commander') {
    const isBoss = pilotId === 'ai_boss_overlord';
    return (
      <svg
        viewBox="0 0 64 64"
        className={`rounded-lg border border-rose-500/60 bg-slate-950 ${className}`}
        data-testid={`pilot-portrait-${pilotId}`}
        aria-label="Enemy Commander"
      >
        <rect width="64" height="64" fill={isBoss ? '#450a0a' : '#27272a'} />
        {/* Armored Collar */}
        <path d="M10,64 L18,44 L46,44 L54,64 Z" fill="#18181b" stroke="#f43f5e" strokeWidth="1.5" />
        {/* Masked Helmet */}
        <polygon points="32,8 46,20 43,42 32,48 21,42 18,20" fill="#27272a" stroke="#fb7185" strokeWidth="1.5" />
        {/* Glowing Crimson Visor */}
        <polygon points="21,24 43,24 39,30 25,30" fill="#e11d48" />
        <line x1="25" y1="27" x2="39" y2="27" stroke="#fde047" strokeWidth="1.8" />
        {isBoss && (
          <>
            <polygon points="18,16 10,6 22,12" fill="#f59e0b" />
            <polygon points="46,16 54,6 42,12" fill="#f59e0b" />
          </>
        )}
      </svg>
    );
  }

  // Default AI Grunt Core
  return (
    <svg
      viewBox="0 0 64 64"
      className={`rounded-lg border ${
        isEnemy ? 'border-rose-500/40' : 'border-cyan-500/40'
      } bg-slate-950 ${className}`}
      data-testid={`pilot-portrait-${pilotId}`}
      aria-label="Automaton AI"
    >
      <rect width="64" height="64" fill="#18181b" />
      <circle cx="32" cy="32" r="18" fill="none" stroke="#f43f5e" strokeWidth="1.5" strokeDasharray="6 3" />
      <circle cx="32" cy="32" r="11" fill="#27272a" stroke="#fb7185" strokeWidth="1.5" />
      <circle cx="32" cy="32" r="5" fill="#f43f5e" />
      <circle cx="32" cy="32" r="2" fill="#fef08a" />
    </svg>
  );
}
