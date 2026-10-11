const fs = require('fs');
const path = require('path');

const filePath = path.resolve('app/page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

const targetOld = `            {/* Mock map image using CSS pattern for now */}
            <div className="absolute inset-0 bg-[#0A1017]" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-transparent via-[#0A1017]/50 to-[#0A1017]" />
            <div className="absolute top-[30%] left-[40%] w-64 h-64 bg-red-500/10 blur-[50px] rounded-full" />
            <div className="absolute top-[60%] right-[30%] w-48 h-48 bg-cyan-500/10 blur-[40px] rounded-full" />
            <div className="absolute inset-4 pointer-events-none flex flex-col justify-between">
              <div className="flex gap-2">
                <Chip className="bg-black/50 backdrop-blur border border-white/10">AQI Layer</Chip>
                <Chip className="bg-black/50 backdrop-blur border border-white/10">Fires</Chip>
              </div>
              <div className="flex justify-end">
                <PillButton href="/map" variant="glass" size="md" className="pointer-events-auto">Open full map</PillButton>
              </div>
            </div>`;

const replacement = `            {mapLayers ? (
              <div className="w-full h-full relative z-0">
                <MapView layers={mapLayers} />
              </div>
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-[#0A1017]">
                <div className="w-8 h-8 border-3 border-[var(--violet)]/20 border-t-[var(--violet)] rounded-full animate-spin" />
              </div>
            )}

            {/* Simple button with written text and arrow to click to expand */}
            <div className="absolute bottom-4 right-4 z-30 pointer-events-auto">
              <Link
                href="/map"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--bg-1)]/90 hover:bg-[var(--bg-2)] text-[var(--text-hi)] border border-[var(--border)] text-xs font-semibold backdrop-blur-md shadow-xl transition-all hover:scale-105 interactive-tactile"
              >
                <span>Expand Map</span>
                <LuArrowUpRight className="w-4 h-4 text-[var(--violet)]" />
              </Link>
            </div>`;

const isCrlf = content.includes('\r\n');
const normContent = content.replace(/\r\n/g, '\n');
const normOld = targetOld.replace(/\r\n/g, '\n');
const normRep = replacement.replace(/\r\n/g, '\n');

if (normContent.includes(normOld)) {
  let updated = normContent.replace(normOld, normRep);
  if (isCrlf) updated = updated.replace(/\n/g, '\r\n');
  fs.writeFileSync(filePath, updated, 'utf8');
  console.log('SUCCESS');
} else {
  console.error('NOT_FOUND');
}
