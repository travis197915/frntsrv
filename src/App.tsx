function App() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-xl rounded-2xl border border-slate-800 bg-slate-900/60 p-8 shadow-xl shadow-slate-950/40">
        <h1 className="text-2xl font-semibold tracking-tight">
          Wipro UHC
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          Vite + React + TypeScript + Tailwind is ready. We&apos;ll now align
          this app with the `inventure-frontend-app-boilerplate` structure.
        </p>

        <div className="mt-6 grid gap-3 text-sm text-slate-300">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/40">
              ✓
            </span>
            <span>Vite React TS template created</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/40">
              ✓
            </span>
            <span>Tailwind CSS wired up</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-700 text-slate-300 ring-1 ring-slate-600">
              …
            </span>
            <span>Next: mirror boilerplate structure (routes, layouts, primitives)</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
