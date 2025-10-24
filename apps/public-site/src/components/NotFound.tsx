interface NotFoundProps {
  clientAppUrl: string;
}

export default function NotFound({ clientAppUrl }: NotFoundProps) {
  return (
    <div className="min-h-screen bg-background text-content flex items-center justify-center relative overflow-hidden">
      {/* Background Image - Cybertruck on Fire */}
      <div className="absolute inset-0 opacity-40">
        <picture>
          <source srcSet="/images/hero-bg.webp" type="image/webp" />
          <img
            src="/images/hero-bg.jpg"
            alt="Cybertruck burning at Trump Tower"
            className="w-full h-full object-cover object-center"
          />
        </picture>
      </div>

      {/* Dark overlay for readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-background/90 via-background/80 to-background/90" />

      {/* Content */}
      <div className="relative z-10 max-w-4xl mx-auto px-4 py-12 text-center">
        {/* 404 Title */}
        <div className="mb-8">
          <h1 className="text-9xl md:text-[12rem] font-bold gradient-text bg-clip-text text-transparent bg-gradient-to-r from-error via-warning to-primary mb-4">
            404
          </h1>
          <div className="text-2xl md:text-4xl font-bold text-content mb-2">
            This Page Crashed Harder Than a Cybertruck
          </div>
          <div className="text-lg md:text-2xl text-tertiary">
            At Trump Tower. In the rain. With the windows down.
          </div>
        </div>

        {/* Witty Messages */}
        <div className="bg-surface/80 backdrop-blur-lg border-2 border-border rounded-2xl p-8 md:p-12 mb-8 shadow-2xl">
          <div className="space-y-4 text-base md:text-lg text-content/90">
            <p className="flex items-center justify-center gap-2">
              <span className="text-2xl">🔥</span>
              <span>
                <strong>Error 404:</strong> Much like Elon's promises, this page doesn't exist
              </span>
            </p>
            <p className="flex items-center justify-center gap-2">
              <span className="text-2xl">🚗</span>
              <span>Unlike the Cybertruck's build quality, we take our 404s seriously</span>
            </p>
            <p className="flex items-center justify-center gap-2">
              <span className="text-2xl">💸</span>
              <span>This page has been acquired for $44 billion and immediately shut down</span>
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <a
            href="/"
            className="px-8 py-4 bg-primary hover:bg-primary-hover text-surface text-lg font-bold rounded-xl transition-all duration-200 hover:scale-105 shadow-lg"
          >
            🏠 Go Home
          </a>
          <a
            href={clientAppUrl || '/'}
            className="px-8 py-4 bg-surface hover:bg-muted border-2 border-border text-content text-lg font-bold rounded-xl transition-all duration-200 hover:scale-105 shadow-lg"
          >
            🚀 Start Predicting
          </a>
        </div>

        {/* Footer Quip */}
        <div className="mt-12 text-sm md:text-base text-tertiary italic">
          "The page you're looking for is in the same place as Full Self-Driving: nowhere."
        </div>
      </div>
    </div>
  );
}
