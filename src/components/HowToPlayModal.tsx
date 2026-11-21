interface HowToPlayModalProps {
  onClose: () => void;
}

export function HowToPlayModal({ onClose }: HowToPlayModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-md"
      data-testid="howto-modal"
    >
      <div className="hud-panel max-h-[90vh] w-full max-w-2xl overflow-y-auto bg-slate-900/95 p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-cyan-500/30 pb-4">
          <div>
            <p className="text-[11px] font-bold tracking-[0.25em] text-cyan-400 uppercase">
              Pilot Briefing
            </p>
            <h2 className="text-xl font-extrabold text-slate-50">
              ❓ วิธีเล่น (HOW TO PLAY)
            </h2>
          </div>
          <button
            type="button"
            data-testid="howto-close-btn"
            onClick={onClose}
            className="cursor-pointer rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-700"
          >
            ปิด
          </button>
        </div>

        <div className="mt-5 space-y-4">
          <div className="rounded-xl border border-cyan-500/30 bg-slate-950/75 p-4">
            <div className="text-sm font-bold text-cyan-300">
              1. วางแผนการเดินและบริหาร EN / Will / SP
            </div>
            <p className="mt-1 text-xs leading-relaxed text-slate-300">
              คลิกเลือกหุ่นเพื่อเดินบนตาราง 8x8 ช่อง ยืนบนช่อง <strong>Base (✚)</strong>{' '}
              เพื่อฟื้นฟู HP/EN 10% ทุกต้นเทิร์น กดใช้{' '}
              <strong>Spirit Commands</strong> (Valor, Focus, Iron Wall, Trust)
              และ <strong>Over-Limit</strong> เพื่อเร่งกำลังใจ <strong>Will ≥ 120</strong>{' '}
              ปลดล็อกท่าไม้ตายสุดแรง!
            </p>
          </div>

          <div className="rounded-xl border border-amber-500/30 bg-slate-950/75 p-4">
            <div className="text-sm font-bold text-amber-300">
              2. ทำคอมโบ Support, Knockback, MAP และ Momentum
            </div>
            <p className="mt-1 text-xs leading-relaxed text-slate-300">
              ยืนติดกับเพื่อนร่วมทีมเพื่อยิงประสาน <strong>Support Attack (+50% DMG, 0 EN)</strong>{' '}
              และป้องกันแทน <strong>Support Defense</strong>, ผลักศัตรูชนสิ่งกีดขวางด้วย{' '}
              <strong>Knockback</strong> เพื่อทำดาเมจ <strong>COLLISION! +500 &amp; Stun</strong>,
              และทำลายศัตรูเพื่อเปิด <strong>Chain-Kill Momentum</strong> เดินตีซ้ำอีก 1 ครั้ง!
            </p>
          </div>

          <div className="rounded-xl border border-rose-500/35 bg-slate-950/75 p-4">
            <div className="text-sm font-bold text-rose-300">
              3. ฝ่า 7 ด่าน สุ่มการ์ด/อาวุธใหม่ และปราบบอสใหญ่
            </div>
            <p className="mt-1 text-xs leading-relaxed text-slate-300">
              หลังชนะด่านต่อสู้ สุ่มเลือก 1 จาก 3 การ์ดอัปเกรดหรืออาวุธใหม่ (ถือได้สูงสุด 5 ชิ้น)
              หากหุ่นหลักพังคือ Permadeath แต่แต้ม <strong>Astral Shards</strong>{' '}
              จะถูกบันทึกถาวรเพื่อนำไปซื้อ <strong>Meta-Upgrades</strong> และปลดล็อก{' '}
              <strong>Threat Level</strong> ระดับสูงขึ้น!
            </p>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="hud-btn cursor-pointer bg-cyan-600 px-6 py-2 text-xs font-bold text-white hover:bg-cyan-500"
          >
            เข้าใจแล้ว — ลุยเลย!
          </button>
        </div>
      </div>
    </div>
  );
}
