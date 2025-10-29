import React, { useState, useCallback } from 'react';

interface CreateAchievementModalProps {
  onClose: () => void;
  onSubmit: (achievementData: CreateAchievementData) => Promise<void>;
  className?: string;
}

interface CreateAchievementData {
  name: string;
  description: string;
  category: string;
  rarity: string;
  iconUrl?: string;
  ruleData?: Record<string, any>;
  isActive: boolean;
}

const CreateAchievementModal: React.FC<CreateAchievementModalProps> = ({
  onClose,
  onSubmit,
  className = '',
}) => {
  const [formData, setFormData] = useState<CreateAchievementData>({
    name: '',
    description: '',
    category: 'general',
    rarity: 'common',
    iconUrl: '',
    ruleData: {},
    isActive: true,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [step, setStep] = useState(1);

  const validateStep = useCallback(
    (stepNumber: number) => {
      const newErrors: Record<string, string> = {};

      if (stepNumber === 1) {
        if (!formData.name.trim()) {
          newErrors.name = 'Name is required';
        } else if (formData.name.trim().length < 3) {
          newErrors.name = 'Name must be at least 3 characters';
        } else if (formData.name.trim().length > 100) {
          newErrors.name = 'Name must be less than 100 characters';
        }

        if (!formData.description.trim()) {
          newErrors.description = 'Description is required';
        } else if (formData.description.trim().length < 10) {
          newErrors.description = 'Description must be at least 10 characters';
        } else if (formData.description.trim().length > 500) {
          newErrors.description = 'Description must be less than 500 characters';
        }

        if (!formData.category.trim()) {
          newErrors.category = 'Category is required';
        }
      }

      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
    },
    [formData],
  );

  const handleInputChange = useCallback(
    (field: keyof CreateAchievementData, value: any) => {
      setFormData((prev) => ({ ...prev, [field]: value }));

      if (errors[field]) {
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[field];
          return newErrors;
        });
      }
    },
    [errors],
  );

  const handleNext = useCallback(() => {
    if (validateStep(step)) {
      setStep((prev) => prev + 1);
    }
  }, [step, validateStep]);

  const handleBack = useCallback(() => {
    setStep((prev) => prev - 1);
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!validateStep(1)) {
        setStep(1);
        return;
      }

      setIsSubmitting(true);
      try {
        await onSubmit(formData);
        onClose();
      } catch (error) {
        console.error('Failed to create achievement:', error);
        setErrors({ submit: 'Failed to create achievement. Please try again.' });
      } finally {
        setIsSubmitting(false);
      }
    },
    [formData, onSubmit, onClose, validateStep],
  );

  const categories = [
    'general',
    'prediction',
    'pong',
    'social',
    'financial',
    'streak',
    'participation',
    'milestone',
    'special',
    'seasonal',
  ];

  const rarities = [
    { value: 'common', label: 'Common', color: 'text-tertiary' },
    { value: 'uncommon', label: 'Uncommon', color: 'text-info' },
    { value: 'rare', label: 'Rare', color: 'text-primary' },
    { value: 'epic', label: 'Epic', color: 'text-secondary' },
    { value: 'legendary', label: 'Legendary', color: 'text-warning' },
    { value: 'secret', label: 'Secret', color: 'text-error' },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div
        className={`bg-surface rounded-lg border border-muted max-w-2xl w-full max-h-[90vh] overflow-hidden ${className}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-muted">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-content">Create New Achievement</h2>
            <span className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full">
              Step {step} of 2
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-tertiary hover:text-content transition-colors p-1"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Progress Bar */}
        <div className="px-6 py-2 bg-background">
          <div className="flex items-center gap-2">
            <div
              className={`flex-1 h-2 rounded-full ${step >= 1 ? 'bg-primary' : 'bg-muted'}`}
            ></div>
            <div
              className={`flex-1 h-2 rounded-full ${step >= 2 ? 'bg-primary' : 'bg-muted'}`}
            ></div>
          </div>
          <div className="flex justify-between text-xs text-tertiary mt-1">
            <span>Basic Info</span>
            <span>Configuration</span>
          </div>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="overflow-y-auto max-h-[calc(90vh-200px)]">
          <div className="p-6 space-y-6">
            {/* Step 1: Basic Information */}
            {step === 1 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-content mb-4">Basic Information</h3>

                  {/* Name */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-content mb-2">
                        Achievement Name *
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        placeholder="Enter achievement name..."
                        className={`w-full px-3 py-2 bg-background border rounded-lg text-content placeholder-tertiary focus:outline-none focus:ring-1 focus:ring-primary ${
                          errors.name ? 'border-error' : 'border-muted'
                        }`}
                        maxLength={100}
                      />
                      {errors.name && <p className="text-error text-sm mt-1">{errors.name}</p>}
                      <div className="flex justify-between text-xs text-tertiary mt-1">
                        <span>Make it memorable and descriptive</span>
                        <span>{formData.name.length}/100</span>
                      </div>
                    </div>

                    {/* Description */}
                    <div>
                      <label className="block text-sm font-medium text-content mb-2">
                        Description *
                      </label>
                      <textarea
                        value={formData.description}
                        onChange={(e) => handleInputChange('description', e.target.value)}
                        placeholder="Describe what users need to do to earn this achievement..."
                        rows={4}
                        className={`w-full px-3 py-2 bg-background border rounded-lg text-content placeholder-tertiary focus:outline-none focus:ring-1 focus:ring-primary resize-none ${
                          errors.description ? 'border-error' : 'border-muted'
                        }`}
                        maxLength={500}
                      />
                      {errors.description && (
                        <p className="text-error text-sm mt-1">{errors.description}</p>
                      )}
                      <div className="flex justify-between text-xs text-tertiary mt-1">
                        <span>Explain the achievement criteria clearly</span>
                        <span>{formData.description.length}/500</span>
                      </div>
                    </div>

                    {/* Category and Rarity */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-content mb-2">
                          Category *
                        </label>
                        <select
                          value={formData.category}
                          onChange={(e) => handleInputChange('category', e.target.value)}
                          className="w-full px-3 py-2 bg-background border border-muted rounded-lg text-content focus:outline-none focus:ring-1 focus:ring-primary"
                        >
                          {categories.map((category) => (
                            <option key={category} value={category}>
                              {category.charAt(0).toUpperCase() + category.slice(1)}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-content mb-2">
                          Rarity
                        </label>
                        <select
                          value={formData.rarity}
                          onChange={(e) => handleInputChange('rarity', e.target.value)}
                          className="w-full px-3 py-2 bg-background border border-muted rounded-lg text-content focus:outline-none focus:ring-1 focus:ring-primary"
                        >
                          {rarities.map((rarity) => (
                            <option key={rarity.value} value={rarity.value}>
                              {rarity.label}
                            </option>
                          ))}
                        </select>
                        <div className="text-xs text-tertiary mt-1">
                          <span
                            className={rarities.find((r) => r.value === formData.rarity)?.color}
                          >
                            {rarities.find((r) => r.value === formData.rarity)?.label} rarity
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Preview */}
                <div className="bg-background rounded-lg border border-muted p-4">
                  <h4 className="text-sm font-medium text-content mb-3">Preview</h4>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center text-primary text-xl">
                      🏆
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-content">
                        {formData.name || 'Achievement Name'}
                      </div>
                      <div className="text-sm text-tertiary">
                        {formData.description || 'Achievement description will appear here...'}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-tertiary capitalize">
                          {formData.category}
                        </span>
                        <span className="text-xs text-tertiary">•</span>
                        <span
                          className={`text-xs ${rarities.find((r) => r.value === formData.rarity)?.color}`}
                        >
                          {rarities.find((r) => r.value === formData.rarity)?.label}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Configuration */}
            {step === 2 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-content mb-4">Configuration</h3>

                  {/* Icon URL */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-content mb-2">
                        Icon URL (Optional)
                      </label>
                      <input
                        type="url"
                        value={formData.iconUrl || ''}
                        onChange={(e) => handleInputChange('iconUrl', e.target.value)}
                        placeholder="https://example.com/icon.png"
                        className="w-full px-3 py-2 bg-background border border-muted rounded-lg text-content placeholder-tertiary focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                      <p className="text-xs text-tertiary mt-1">
                        Leave empty to use default trophy icon
                      </p>
                    </div>

                    {/* Status */}
                    <div>
                      <label className="block text-sm font-medium text-content mb-2">
                        Initial Status
                      </label>
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            checked={formData.isActive}
                            onChange={() => handleInputChange('isActive', true)}
                            className="w-4 h-4 text-primary bg-background border border-muted focus:ring-1 focus:ring-primary"
                          />
                          <span className="text-sm text-content">Active</span>
                          <span className="text-xs text-tertiary">(Users can unlock)</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            checked={!formData.isActive}
                            onChange={() => handleInputChange('isActive', false)}
                            className="w-4 h-4 text-primary bg-background border border-muted focus:ring-1 focus:ring-primary"
                          />
                          <span className="text-sm text-content">Inactive</span>
                          <span className="text-xs text-tertiary">(Hidden from users)</span>
                        </label>
                      </div>
                    </div>

                    {/* Rule Configuration Notice */}
                    <div className="bg-info/10 border border-info/30 rounded-lg p-4">
                      <div className="flex items-start gap-2">
                        <span className="text-info text-lg">ℹ️</span>
                        <div className="text-sm">
                          <div className="font-medium text-info mb-1">Achievement Rules</div>
                          <div className="text-content">
                            After creating this achievement, you can configure unlock rules using
                            the Rule Builder. Rules determine when and how users can earn this
                            achievement.
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Final Preview */}
                <div className="bg-background rounded-lg border border-muted p-4">
                  <h4 className="text-sm font-medium text-content mb-3">Final Preview</h4>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center text-primary text-xl">
                        {formData.iconUrl ? (
                          <img
                            src={formData.iconUrl}
                            alt="Achievement icon"
                            className="w-8 h-8 rounded"
                            onError={(e) => {
                              const target = e.currentTarget as HTMLImageElement;
                              target.style.display = 'none';
                              const nextSibling = target.nextElementSibling as HTMLElement;
                              if (nextSibling) {
                                nextSibling.style.display = 'block';
                              }
                            }}
                          />
                        ) : null}
                        <span style={formData.iconUrl ? { display: 'none' } : {}}>🏆</span>
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-content">{formData.name}</div>
                        <div className="text-sm text-tertiary">{formData.description}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-tertiary capitalize">
                            {formData.category}
                          </span>
                          <span className="text-xs text-tertiary">•</span>
                          <span
                            className={`text-xs ${rarities.find((r) => r.value === formData.rarity)?.color}`}
                          >
                            {rarities.find((r) => r.value === formData.rarity)?.label}
                          </span>
                          <span className="text-xs text-tertiary">•</span>
                          <span
                            className={`text-xs ${formData.isActive ? 'text-success' : 'text-tertiary'}`}
                          >
                            {formData.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Error Display */}
            {errors.submit && (
              <div className="bg-error/10 border border-error/30 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <span className="text-error text-lg">⚠️</span>
                  <div className="text-sm text-error">{errors.submit}</div>
                </div>
              </div>
            )}
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 p-6 border-t border-muted bg-background">
          <div className="flex items-center gap-3">
            {step > 1 && (
              <button
                type="button"
                onClick={handleBack}
                disabled={isSubmitting}
                className="px-4 py-2 text-tertiary hover:text-content transition-colors disabled:opacity-50"
              >
                Back
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-tertiary hover:text-content transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            {step < 2 ? (
              <button
                type="button"
                onClick={handleNext}
                disabled={isSubmitting}
                className="px-6 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary-hover disabled:opacity-50 transition-colors"
              >
                Next
              </button>
            ) : (
              <button
                type="submit"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="px-6 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary-hover disabled:opacity-50 transition-colors flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Creating...
                  </>
                ) : (
                  'Create Achievement'
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateAchievementModal;
