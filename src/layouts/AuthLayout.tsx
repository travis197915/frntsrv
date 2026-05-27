import type { ReactNode } from 'react';

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
}

export function AuthLayout({ title, subtitle, children, footer }: AuthLayoutProps) {
  return (
    <div className="min-h-dvh bg-[#fafafa] dark:bg-[#0f0f10] text-foreground flex flex-col lg:flex-row">
      <div className="hidden lg:flex lg:w-[52%] xl:w-[55%] flex-col bg-primary relative overflow-hidden">
        <div className="absolute -top-32 -right-32 w-[420px] h-[420px] rounded-full bg-white/5" />
        <div className="absolute top-1/3 -right-16 w-[260px] h-[260px] rounded-full bg-white/4" />
        <div className="absolute -bottom-24 -left-24 w-[360px] h-[360px] rounded-full bg-white/5" />

        <div className="relative z-10 flex flex-col h-full px-14 xl:px-20 py-14">
          <div className="flex items-center gap-3 mb-auto">
            <img src="/wipro.png" alt="Wipro" className="h-15 object-contain brightness-0 invert" />
          </div>

          <div className="mb-auto">
            <h1 className="text-4xl xl:text-5xl font-bold text-white leading-[1.15] mb-5">
              AI-Powered
              <br />
              Claims
              <br />
              Intelligence
            </h1>
            <p className="text-[17px] text-white/70 leading-relaxed max-w-sm">
              Streamline UHG claims processing with intelligent automation, real-time analytics, and enterprise-grade compliance.
            </p>
          </div>

          <div className="space-y-5 mb-14">
            {[
              { title: 'Automated Claims Routing', desc: 'AI agents triage and route claims with precision and speed' },
              { title: 'Real-Time Decision Support', desc: 'Live analytics surface insights at every step of adjudication' },
              { title: 'HIPAA & SOC 2 Compliant', desc: 'Built to meet healthcare regulatory standards from the ground up' },
            ].map((item) => (
              <div key={item.title} className="flex items-start gap-3.5">
                <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                  <svg className="h-3.5 w-3.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">{item.title}</h3>
                  <p className="text-sm text-white/60">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <p className="text-xs text-white/40 font-medium tracking-wide">
            POWERED BY WIPRO · UHG CLAIMS PLATFORM
          </p>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center px-6 py-14 sm:px-10 lg:px-12 xl:px-20">
        <div className="w-full max-w-[400px]">
          <div className="flex lg:hidden flex-col items-center gap-3 mb-10">
            <img src="/wipro.png" alt="Wipro" className="h-8 object-contain dark:invert" />
            <p className="text-sm text-muted-foreground text-center max-w-xs">
              AI-Powered Claims Intelligence for UHG
            </p>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
            <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>
          </div>

          <div className="rounded-xl border border-border bg-card p-6 sm:p-8 shadow-sm">
            {children}
            {footer}
          </div>

          <p className="mt-8 text-center text-xs text-muted-foreground">
            HIPAA Compliant · SOC 2 Type II · ISO 27001
          </p>
        </div>
      </div>
    </div>
  );
}
