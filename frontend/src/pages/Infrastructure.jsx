function Infrastructure({ onNavigate }) {
  const navItems = [
    { label: 'Network', view: 'network' },
    { label: 'Infrastructure', view: 'infrastructure' },
    { label: 'Protocols', view: 'protocols' },
    { label: 'Authority', view: 'authority' },
  ]

  const statusCards = [
    {
      title: 'Authority Engine',
      status: 'ONLINE',
      detail: 'UPTIME: 99.999%',
      icon: '◈',
    },
    {
      title: 'Policy Engine',
      status: 'ONLINE',
      detail: 'EVALS/SEC: 4,201',
      icon: '◇',
    },
    {
      title: 'Permission Registry',
      status: 'ONLINE',
      detail: 'SYNC: 0ms LATENCY',
      icon: '▣',
    },
    {
      title: 'Audit Log',
      status: 'ONLINE',
      detail: 'INGEST: ACTIVE',
      icon: '◷',
    },
  ]

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-cream)]">
      
      {/* NAVBAR */}
      <header className="fixed top-0 left-0 z-50 w-full border-b border-[rgba(245,241,232,0.12)] bg-[var(--color-bg)]">
        <div className="mx-auto flex h-20 max-w-[1280px] items-center justify-between px-5 md:px-16">
          
          {/* LOGO */}
          <button
            onClick={() => onNavigate?.('landing')}
            className="flex items-center gap-2 font-bold tracking-tight text-[var(--color-accent)]"
          >
            <span className="text-xl">◈</span>
            <span className="text-xl">TRACE</span>
          </button>

          {/* NAVIGATION */}
          <nav className="hidden items-center gap-8 md:flex">
            {navItems.map((item) => (
              <button
                key={item.view}
                onClick={() => onNavigate?.(item.view)}
                className={`font-mono text-xs uppercase tracking-[0.16em] transition ${
                  item.view === 'infrastructure'
                    ? 'border-b border-[var(--color-accent)] pb-1 text-[var(--color-accent)]'
                    : 'text-[var(--color-cream-dim)] hover:text-[var(--color-accent)]'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>

          {/* ACTIONS */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => onNavigate?.('login')}
              className="hidden font-mono text-xs uppercase tracking-[0.16em] text-[var(--color-cream-dim)] transition hover:text-[var(--color-accent)] md:block"
            >
              Login
            </button>

            <button
              onClick={() => onNavigate?.('signup')}
              className="border border-[var(--color-accent)] bg-[var(--color-accent)] px-4 py-2 font-mono text-xs uppercase tracking-[0.16em] text-[var(--color-bg)] transition hover:opacity-80"
            >
              Signup
            </button>
          </div>
        </div>
      </header>

      {/* MAIN */}
      <main className="mx-auto flex w-full max-w-[1280px] flex-col gap-24 px-5 pb-24 pt-32 md:px-16">

        {/* PAGE INTRO */}
        <section className="flex max-w-3xl flex-col gap-4">
          <div className="flex items-center gap-3">
            <span className="h-2 w-2 animate-pulse bg-[var(--color-accent)]" />

            <span className="font-mono text-xs uppercase tracking-[0.18em] text-[var(--color-accent)]">
              System Live
            </span>
          </div>

          <h1 className="text-4xl font-bold tracking-tight md:text-6xl">
            Core Infrastructure
          </h1>

          <p className="max-w-xl text-sm leading-6 text-[var(--color-cream-dim)] md:text-base">
            Real-time monitoring of the TRACE Authority Layer.
            Human presence dictates AI authorization pathways across
            the secure environment.
          </p>
        </section>

        {/* STATUS CARDS */}
        <section className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {statusCards.map((card) => (
            <div
              key={card.title}
              className="group flex min-h-[190px] flex-col justify-between border border-[rgba(245,241,232,0.14)] bg-[var(--color-panel)] p-6 transition hover:border-[var(--color-accent)]"
            >
              <div className="flex items-start justify-between">
                <span className="font-mono text-xs uppercase tracking-[0.12em] text-[var(--color-cream-dim)]">
                  {card.title}
                </span>

                <span className="text-[var(--color-cream-dim)]">
                  {card.icon}
                </span>
              </div>

              <div>
                <div className="mb-2 flex items-center gap-2">
                  <span className="h-2 w-2 bg-[var(--color-accent)]" />

                  <span className="font-mono text-xs text-[var(--color-accent)]">
                    {card.status}
                  </span>
                </div>

                <div className="font-mono text-[10px] uppercase tracking-wider text-[var(--color-cream-dim)]">
                  {card.detail}
                </div>
              </div>
            </div>
          ))}
        </section>

        {/* ARCHITECTURE FLOW */}
        <section className="flex flex-col gap-8">
          <h2 className="border-b border-[rgba(245,241,232,0.14)] pb-4 text-2xl font-semibold md:text-3xl">
            Architecture Flow
          </h2>

          <div className="relative overflow-x-auto pb-8">
            <div className="mx-auto flex min-w-[760px] flex-col items-center gap-8 py-8">

              {/* HUMAN AUTHORITY */}
              <div className="relative z-10 flex w-64 items-center justify-center gap-4 border border-[rgba(245,241,232,0.14)] bg-[var(--color-panel)] px-6 py-4">
                <span className="text-[var(--color-accent)]">●</span>

                <span className="font-mono text-xs uppercase tracking-[0.12em]">
                  Human Authority
                </span>
              </div>

              <div className="text-[var(--color-cream-dim)]">↓</div>

              {/* AUTHORITY + POLICY */}
              <div className="flex items-center gap-8">
                <div className="flex w-56 flex-col items-center gap-2 border border-[rgba(245,241,232,0.14)] bg-[var(--color-panel)] px-6 py-4">
                  <span className="text-lg text-[var(--color-cream-dim)]">◇</span>

                  <span className="text-center font-mono text-xs uppercase tracking-[0.1em]">
                    Authority Layer
                  </span>
                </div>

                <span className="text-[var(--color-cream-dim)]">→</span>

                <div className="flex w-56 flex-col items-center gap-2 border border-[rgba(245,241,232,0.14)] bg-[var(--color-panel)] px-6 py-4">
                  <span className="text-lg text-[var(--color-cream-dim)]">◆</span>

                  <span className="text-center font-mono text-xs uppercase tracking-[0.1em]">
                    Policy Engine
                  </span>
                </div>
              </div>

              <div className="text-[var(--color-cream-dim)]">↓</div>

              {/* REGISTRY + VERIFICATION */}
              <div className="flex items-center gap-8">
                <div className="flex w-56 flex-col items-center gap-2 border border-dashed border-[rgba(245,241,232,0.18)] bg-[var(--color-panel)] px-6 py-4">
                  <span className="text-lg text-[var(--color-cream-dim)]">▣</span>

                  <span className="text-center font-mono text-xs uppercase tracking-[0.1em]">
                    Permission Registry
                  </span>
                </div>

                <span className="text-[var(--color-cream-dim)]">↔</span>

                <div className="flex w-56 flex-col items-center gap-2 border border-dashed border-[rgba(245,241,232,0.18)] bg-[var(--color-panel)] px-6 py-4">
                  <span className="text-lg text-[var(--color-cream-dim)]">✓</span>

                  <span className="text-center font-mono text-xs uppercase tracking-[0.1em]">
                    Verification Layer
                  </span>
                </div>
              </div>

              <div className="text-[var(--color-cream-dim)]">↓</div>

              {/* AI + AUDIT */}
              <div className="flex items-center gap-8">
                <div className="flex w-64 flex-col items-center gap-3 border border-[var(--color-accent)] bg-[var(--color-panel-soft)] px-8 py-6 shadow-[0_0_30px_rgba(198,227,133,0.08)]">
                  <span className="text-2xl text-[var(--color-accent)]">
                    ◈
                  </span>

                  <span className="text-center font-mono text-xs font-bold uppercase tracking-[0.14em] text-[var(--color-accent)]">
                    AI Agent Execution
                  </span>
                </div>

                <span className="text-[var(--color-cream-dim)]">→</span>

                <div className="flex w-48 flex-col items-center gap-2 border border-[rgba(245,241,232,0.14)] bg-[var(--color-panel)] px-6 py-4 opacity-80">
                  <span className="text-lg text-[var(--color-cream-dim)]">
                    ◷
                  </span>

                  <span className="text-center font-mono text-xs uppercase tracking-[0.1em]">
                    Audit Log
                  </span>
                </div>
              </div>

            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-[rgba(245,241,232,0.12)] bg-[var(--color-bg-soft)]">
        <div className="mx-auto flex w-full max-w-[1280px] flex-col items-center justify-between gap-6 px-5 py-8 md:flex-row md:px-16">
          
          <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--color-cream-dim)]">
            © 2024 TRACE INFRASTRUCTURE ACADEMY. ALL RIGHTS RESERVED.
          </div>

          <nav className="flex gap-6 font-mono text-[10px] uppercase tracking-[0.1em]">
            <button
              onClick={() => onNavigate?.('security-log')}
              className="text-[var(--color-cream-dim)] hover:text-[var(--color-accent)]"
            >
              Security Log
            </button>

            <button className="text-[var(--color-cream-dim)] hover:text-[var(--color-accent)]">
              Privacy Protocol
            </button>

            <button
              onClick={() => onNavigate?.('terminal')}
              className="text-[var(--color-cream-dim)] hover:text-[var(--color-accent)]"
            >
              Terminal Access
            </button>
          </nav>
        </div>
      </footer>
    </div>
  )
}

export default Infrastructure