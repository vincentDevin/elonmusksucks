// apps/client/src/components/dashboard/customization/LayoutSelector.tsx
import { useDashboardCustomization } from '../../../hooks/useDashboardCustomization';

export default function LayoutSelector() {
  const { currentLayout, availableLayouts, updateLayout } = useDashboardCustomization();

  const getLayoutPreview = (layout: (typeof availableLayouts)[0]) => {
    const { columns, panelSizes: _panelSizes, sidebarPosition } = layout;

    return (
      <div className="w-full h-24 bg-background rounded border border-muted p-2">
        {columns === 'single' && <div className="h-full bg-surface rounded"></div>}

        {columns === 'two-column' && (
          <div
            className={`h-full flex gap-1 ${sidebarPosition === 'left' ? 'flex-row-reverse' : ''}`}
          >
            <div className="flex-1 bg-surface rounded"></div>
            <div className="w-8 bg-surface/60 rounded"></div>
          </div>
        )}

        {columns === 'three-column' && (
          <div className="h-full flex gap-1">
            <div className="flex-1 bg-surface rounded"></div>
            <div className="flex-1 bg-surface/80 rounded"></div>
            <div className="w-6 bg-surface/60 rounded"></div>
          </div>
        )}
      </div>
    );
  };

  const getPanelSizeIndicator = (size: 'small' | 'medium' | 'large') => {
    const colors = {
      small: 'bg-yellow-100 text-yellow-800',
      medium: 'bg-blue-100 text-blue-800',
      large: 'bg-green-100 text-green-800',
    };

    return <span className={`px-2 py-1 rounded-full text-xs ${colors[size]}`}>{size}</span>;
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold text-content mb-2">Dashboard Layout</h3>
        <p className="text-tertiary">
          Choose a layout that matches your trading style and information needs
        </p>
      </div>

      {/* Current Layout Info */}
      <div className="bg-background/50 rounded-xl p-4 border border-muted">
        <div className="flex items-center space-x-4">
          <div className="text-3xl">{currentLayout.preview}</div>
          <div className="flex-1">
            <h4 className="font-semibold text-content">{currentLayout.name}</h4>
            <p className="text-sm text-tertiary">{currentLayout.description}</p>
            <div className="flex items-center space-x-2 mt-2">
              <span className="text-xs text-tertiary">Panel sizes:</span>
              {getPanelSizeIndicator(currentLayout.panelSizes.analytics)}
              {getPanelSizeIndicator(currentLayout.panelSizes.predictions)}
              {getPanelSizeIndicator(currentLayout.panelSizes.activity)}
            </div>
          </div>
        </div>
      </div>

      {/* Layout Options */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {availableLayouts.map((layout) => (
          <div
            key={layout.id}
            className={`relative rounded-xl border-2 transition-all cursor-pointer p-4 ${
              currentLayout.id === layout.id
                ? 'border-primary shadow-lg'
                : 'border-muted hover:border-primary/50 hover:shadow-md'
            }`}
            onClick={() => updateLayout(layout.id)}
          >
            {/* Layout Preview */}
            <div className="mb-4">{getLayoutPreview(layout)}</div>

            {/* Layout Info */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-content flex items-center">
                  <span className="mr-2">{layout.preview}</span>
                  {layout.name}
                </h4>

                {currentLayout.id === layout.id && (
                  <div className="px-2 py-1 bg-primary text-white text-xs rounded-full">Active</div>
                )}
              </div>

              <p className="text-sm text-tertiary mb-3">{layout.description}</p>

              {/* Layout Details */}
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-tertiary">Layout:</span>
                  <span className="text-content capitalize">
                    {layout.columns.replace('-', ' ')}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-tertiary">Sidebar:</span>
                  <span className="text-content capitalize">{layout.sidebarPosition}</span>
                </div>

                <div className="pt-2 border-t border-muted">
                  <div className="grid grid-cols-3 gap-2">
                    <div className="text-center">
                      <div className="text-tertiary text-xs mb-1">Analytics</div>
                      {getPanelSizeIndicator(layout.panelSizes.analytics)}
                    </div>
                    <div className="text-center">
                      <div className="text-tertiary text-xs mb-1">Predictions</div>
                      {getPanelSizeIndicator(layout.panelSizes.predictions)}
                    </div>
                    <div className="text-center">
                      <div className="text-tertiary text-xs mb-1">Activity</div>
                      {getPanelSizeIndicator(layout.panelSizes.activity)}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Selection Indicator */}
            {currentLayout.id === layout.id && (
              <div className="absolute top-2 right-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                <span className="text-white text-sm">✓</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Custom Layout Builder (Future Enhancement) */}
      <div className="bg-background/50 rounded-xl p-4 border border-muted border-dashed">
        <div className="text-center py-8">
          <div className="text-4xl mb-2">🔧</div>
          <h4 className="font-semibold text-content mb-2">Custom Layout Builder</h4>
          <p className="text-sm text-tertiary mb-4">
            Create your own custom dashboard layout (Coming Soon)
          </p>
          <button
            className="px-4 py-2 bg-muted text-tertiary rounded-lg cursor-not-allowed"
            disabled
          >
            Build Custom Layout
          </button>
        </div>
      </div>

      {/* Layout Tips */}
      <div className="bg-blue-50/10 border border-blue-200 rounded-xl p-4">
        <h4 className="font-semibold text-content mb-2 flex items-center">
          <span className="mr-2">💡</span>
          Layout Tips
        </h4>
        <ul className="text-sm text-tertiary space-y-1">
          <li>
            • <strong>Casual Bettor:</strong> Simple layout for occasional users
          </li>
          <li>
            • <strong>Day Trader:</strong> Maximum information density for active trading
          </li>
          <li>
            • <strong>Social Player:</strong> Emphasizes community features and friend activity
          </li>
          <li>
            • <strong>Analytics Pro:</strong> Focuses on charts and statistical analysis
          </li>
        </ul>
      </div>
    </div>
  );
}
