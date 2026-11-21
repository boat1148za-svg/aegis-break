interface MechaSpriteProps {
  mechaId: string;
  faction?: 'player' | 'enemy';
  acted?: boolean;
  className?: string;
}

export function MechaSprite({
  mechaId,
  faction = 'player',
  acted = false,
  className = 'h-10 w-10',
}: MechaSpriteProps) {
  const actedClass = acted
    ? 'grayscale-[65%] brightness-75 opacity-75 translate-y-0.5 scale-95'
    : 'drop-shadow-[0_0_6px_rgba(34,211,238,0.35)]';

  const wrapperClass = `inline-block transition-all duration-300 ${actedClass} ${className}`;

  // 1. Giga-Rex (Super Robot: Heavy horned V-fin, broad shoulders, glowing reactor)
  if (mechaId === 'giga_rex' || mechaId === 'aegis_01') {
    return (
      <svg
        viewBox="0 0 64 64"
        className={wrapperClass}
        data-testid={`mecha-svg-${mechaId}`}
        aria-label="Giga-Rex"
      >
        {/* Golden V-Fin Horns */}
        <polygon points="32,14 14,4 22,18" fill="#fbbf24" />
        <polygon points="32,14 50,4 42,18" fill="#fbbf24" />
        {/* Heavy Armored Shoulders */}
        <polygon points="8,24 22,18 22,38 10,36" fill="#1d4ed8" stroke="#60a5fa" strokeWidth="1.5" />
        <polygon points="56,24 42,18 42,38 54,36" fill="#1d4ed8" stroke="#60a5fa" strokeWidth="1.5" />
        {/* Torso */}
        <polygon points="20,22 44,22 40,48 24,48" fill="#0f172a" stroke="#38bdf8" strokeWidth="1.5" />
        {/* Chest Core */}
        <polygon points="32,27 38,34 32,41 26,34" fill="#22d3ee" />
        <polygon points="32,30 35,34 32,38 29,34" fill="#ffffff" />
        {/* Head */}
        <polygon points="25,13 39,13 37,23 27,23" fill="#e2e8f0" stroke="#64748b" strokeWidth="1.2" />
        {/* Visor */}
        <rect x="27" y="16" width="10" height="3" rx="1" fill="#38bdf8" />
        {/* Legs */}
        <rect x="22" y="48" width="8" height="11" rx="1.5" fill="#1e3a8a" stroke="#60a5fa" strokeWidth="1" />
        <rect x="34" y="48" width="8" height="11" rx="1.5" fill="#1e3a8a" stroke="#60a5fa" strokeWidth="1" />
      </svg>
    );
  }

  // 2. Valkyrie-X (Real Robot: Sleek winged silhouette, swept fins, sharp crest)
  if (mechaId === 'valkyrie_x') {
    return (
      <svg
        viewBox="0 0 64 64"
        className={wrapperClass}
        data-testid={`mecha-svg-${mechaId}`}
        aria-label="Valkyrie-X"
      >
        {/* Swept Energy Wings */}
        <polygon points="24,26 4,10 10,34 22,36" fill="#06b6d4" fillOpacity="0.85" stroke="#67e8f9" strokeWidth="1.2" />
        <polygon points="40,26 60,10 54,34 42,36" fill="#06b6d4" fillOpacity="0.85" stroke="#67e8f9" strokeWidth="1.2" />
        {/* Inner Wing Blades */}
        <polygon points="22,34 8,42 18,46 25,40" fill="#0284c7" />
        <polygon points="42,34 56,42 46,46 39,40" fill="#0284c7" />
        {/* Sleek Torso */}
        <polygon points="25,22 39,22 36,46 28,46" fill="#f1f5f9" stroke="#38bdf8" strokeWidth="1.3" />
        <polygon points="32,26 36,33 32,39 28,33" fill="#22d3ee" />
        {/* Head Crest */}
        <polygon points="32,5 28,15 36,15" fill="#38bdf8" />
        <polygon points="27,13 37,13 35,22 29,22" fill="#f8fafc" stroke="#94a3b8" strokeWidth="1" />
        <polygon points="29,16 35,16 34,18.5 30,18.5" fill="#06b6d4" />
        {/* Sleek Legs */}
        <polygon points="27,46 31,46 28,59 24,59" fill="#0ea5e9" />
        <polygon points="33,46 37,46 40,59 36,59" fill="#0ea5e9" />
      </svg>
    );
  }

  // 3. Aegis-Medic (Support Medic: Emerald cross emblem, repair array)
  if (mechaId === 'aegis_medic') {
    return (
      <svg
        viewBox="0 0 64 64"
        className={wrapperClass}
        data-testid={`mecha-svg-${mechaId}`}
        aria-label="Aegis-Medic"
      >
        {/* Antenna */}
        <line x1="26" y1="6" x2="26" y2="14" stroke="#34d399" strokeWidth="2" />
        <circle cx="26" cy="6" r="2" fill="#6ee7b7" />
        {/* Shoulders */}
        <rect x="10" y="22" width="12" height="14" rx="3" fill="#047857" stroke="#34d399" strokeWidth="1.3" />
        <rect x="42" y="22" width="12" height="14" rx="3" fill="#047857" stroke="#34d399" strokeWidth="1.3" />
        {/* Chassis */}
        <rect x="21" y="21" width="22" height="25" rx="4" fill="#f1f5f9" stroke="#10b981" strokeWidth="1.5" />
        {/* Medic Cross */}
        <rect x="30" y="27" width="4" height="12" fill="#10b981" />
        <rect x="26" y="31" width="12" height="4" fill="#10b981" />
        {/* Head */}
        <rect x="25" y="11" width="14" height="10" rx="3" fill="#e2e8f0" stroke="#10b981" strokeWidth="1.2" />
        <rect x="28" y="14" width="8" height="3" rx="1" fill="#34d399" />
        {/* Legs */}
        <rect x="23" y="46" width="7" height="12" rx="2" fill="#065f46" />
        <rect x="34" y="46" width="7" height="12" rx="2" fill="#065f46" />
      </svg>
    );
  }

  // 4. Support Mech (Shield-bearing Wingman)
  if (mechaId === 'support_mech') {
    return (
      <svg
        viewBox="0 0 64 64"
        className={wrapperClass}
        data-testid={`mecha-svg-${mechaId}`}
        aria-label="Support Mech"
      >
        {/* Shield on left arm */}
        <polygon points="8,22 20,20 20,44 10,48 6,36" fill="#0e7490" stroke="#22d3ee" strokeWidth="1.5" />
        <line x1="13" y1="25" x2="13" y2="42" stroke="#67e8f9" strokeWidth="1.5" />
        {/* Right shoulder */}
        <rect x="43" y="22" width="11" height="14" rx="2" fill="#155e75" stroke="#22d3ee" strokeWidth="1.2" />
        {/* Body */}
        <rect x="21" y="22" width="22" height="24" rx="3" fill="#0f172a" stroke="#22d3ee" strokeWidth="1.5" />
        <circle cx="32" cy="33" r="4" fill="#22d3ee" />
        {/* Head */}
        <rect x="25" y="11" width="14" height="10" rx="2" fill="#cbd5e1" stroke="#38bdf8" strokeWidth="1.2" />
        <rect x="27" y="14" width="10" height="3" rx="1" fill="#38bdf8" />
        {/* Legs */}
        <rect x="23" y="46" width="7" height="12" rx="1.5" fill="#164e63" />
        <rect x="34" y="46" width="7" height="12" rx="1.5" fill="#164e63" />
      </svg>
    );
  }

  // 5. Overlord Dreadnought (Boss: Towering crowned silhouette, cannons, crimson core)
  if (mechaId === 'overlord_dreadnought' || mechaId === 'aegis_omega') {
    return (
      <svg
        viewBox="0 0 64 64"
        className={wrapperClass}
        data-testid={`mecha-svg-${mechaId}`}
        aria-label="Overlord Dreadnought"
      >
        {/* Twin Back Cannons */}
        <rect x="8" y="6" width="6" height="22" rx="1" fill="#450a0a" stroke="#f43f5e" strokeWidth="1.2" />
        <rect x="50" y="6" width="6" height="22" rx="1" fill="#450a0a" stroke="#f43f5e" strokeWidth="1.2" />
        {/* Boss Crown Horns */}
        <polygon points="32,12 18,4 24,18" fill="#f59e0b" />
        <polygon points="32,12 46,4 40,18" fill="#f59e0b" />
        <polygon points="32,4 29,14 35,14" fill="#f43f5e" />
        {/* Massive Spiked Pauldrons */}
        <polygon points="4,22 22,18 22,42 6,38" fill="#881337" stroke="#fb7185" strokeWidth="1.5" />
        <polygon points="60,22 42,18 42,42 58,38" fill="#881337" stroke="#fb7185" strokeWidth="1.5" />
        {/* Armored Torso */}
        <polygon points="18,20 46,20 42,50 22,50" fill="#18181b" stroke="#f43f5e" strokeWidth="1.8" />
        {/* Menacing Crimson Core */}
        <polygon points="32,26 40,35 32,44 24,35" fill="#e11d48" />
        <circle cx="32" cy="35" r="3.5" fill="#fde047" />
        {/* Head & Visor */}
        <polygon points="24,12 40,12 38,22 26,22" fill="#27272a" stroke="#fb7185" strokeWidth="1.2" />
        <polygon points="26,16 38,16 36,19 28,19" fill="#f43f5e" />
        {/* Heavy Legs */}
        <rect x="20" y="50" width="9" height="11" fill="#4c0519" stroke="#f43f5e" strokeWidth="1" />
        <rect x="35" y="50" width="9" height="11" fill="#4c0519" stroke="#f43f5e" strokeWidth="1" />
      </svg>
    );
  }

  // 6. Crimson Commander (Elite Enemy: Horned ace helm, crimson armor)
  if (mechaId === 'crimson_commander') {
    return (
      <svg
        viewBox="0 0 64 64"
        className={wrapperClass}
        data-testid={`mecha-svg-${mechaId}`}
        aria-label="Crimson Commander"
      >
        <polygon points="32,5 28,16 36,16" fill="#fbbf24" />
        <polygon points="8,24 22,18 22,38 12,38" fill="#9f1239" stroke="#fda4af" strokeWidth="1.4" />
        <polygon points="56,24 42,18 42,38 52,38" fill="#9f1239" stroke="#fda4af" strokeWidth="1.4" />
        <polygon points="21,21 43,21 39,47 25,47" fill="#1f2937" stroke="#f43f5e" strokeWidth="1.5" />
        <polygon points="32,28 37,34 32,40 27,34" fill="#fb7185" />
        <polygon points="25,13 39,13 37,22 27,22" fill="#be123c" stroke="#fda4af" strokeWidth="1.1" />
        <rect x="27" y="16" width="10" height="2.8" fill="#fde047" />
        <rect x="23" y="47" width="7" height="11" fill="#881337" />
        <rect x="34" y="47" width="7" height="11" fill="#881337" />
      </svg>
    );
  }

  // 7. Viper Scout (Fast Interceptor Drone)
  if (mechaId === 'viper_scout') {
    return (
      <svg
        viewBox="0 0 64 64"
        className={wrapperClass}
        data-testid={`mecha-svg-${mechaId}`}
        aria-label="Viper Scout"
      >
        {/* Sharp swept interceptor wings */}
        <polygon points="32,12 6,36 22,38 32,26" fill="#991b1b" stroke="#f87171" strokeWidth="1.3" />
        <polygon points="32,12 58,36 42,38 32,26" fill="#991b1b" stroke="#f87171" strokeWidth="1.3" />
        {/* Central pod */}
        <polygon points="32,10 42,30 32,52 22,30" fill="#18181b" stroke="#fb7185" strokeWidth="1.5" />
        {/* Predatory Optical Sensor */}
        <circle cx="32" cy="27" r="5" fill="#f43f5e" />
        <circle cx="32" cy="27" r="2" fill="#fef08a" />
        {/* Thruster Glow */}
        <polygon points="28,50 36,50 32,59" fill="#fb923c" />
      </svg>
    );
  }

  // 8. Default / Iron Sentinel (Menacing mono-eye heavy grunt)
  const isEnemy = faction === 'enemy';
  return (
    <svg
      viewBox="0 0 64 64"
      className={wrapperClass}
      data-testid={`mecha-svg-${mechaId}`}
      aria-label="Iron Sentinel"
    >
      <rect
        x="10"
        y="22"
        width="12"
        height="16"
        rx="2"
        fill={isEnemy ? '#3f3f46' : '#1e3a8a'}
        stroke={isEnemy ? '#f43f5e' : '#38bdf8'}
        strokeWidth="1.4"
      />
      <rect
        x="42"
        y="22"
        width="12"
        height="16"
        rx="2"
        fill={isEnemy ? '#3f3f46' : '#1e3a8a'}
        stroke={isEnemy ? '#f43f5e' : '#38bdf8'}
        strokeWidth="1.4"
      />
      <polygon
        points="21,21 43,21 40,46 24,46"
        fill="#18181b"
        stroke={isEnemy ? '#fb7185' : '#38bdf8'}
        strokeWidth="1.5"
      />
      {/* Mono-eye Dome Head */}
      <path
        d="M24,21 C24,11 40,11 40,21 Z"
        fill="#27272a"
        stroke={isEnemy ? '#f43f5e' : '#38bdf8'}
        strokeWidth="1.3"
      />
      <rect x="25" y="16" width="14" height="3.5" rx="1.5" fill="#09090b" />
      <circle cx="32" cy="17.7" r="2.2" fill={isEnemy ? '#f43f5e' : '#22d3ee'} />
      {/* Chest vent */}
      <rect x="27" y="28" width="10" height="4" rx="1" fill={isEnemy ? '#e11d48' : '#0ea5e9'} />
      <rect x="23" y="46" width="7" height="12" rx="1.5" fill="#27272a" stroke="#52525b" strokeWidth="1" />
      <rect x="34" y="46" width="7" height="12" rx="1.5" fill="#27272a" stroke="#52525b" strokeWidth="1" />
    </svg>
  );
}
