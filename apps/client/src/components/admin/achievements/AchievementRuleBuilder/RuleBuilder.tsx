import React, { useState, useCallback, useEffect } from 'react';
import type { JsonRuleAchievementData, RuleValidationResult } from '@ems/types';
import { validateAchievementRule } from '../../../../api/admin';
import { EventSelector } from './EventSelector';
import { ProgressTypeSelector } from './ProgressTypeSelector';
import { ConditionBuilder } from './ConditionBuilder';
import { UnlockConditionBuilder } from './UnlockConditionBuilder';
import { CounterSelector } from './CounterSelector';
import { RulePreview } from './RulePreview';
import { ValidationFeedback, ProgressIndicator, FieldValidation } from './ValidationFeedback';
import { RuleSimulator } from './RuleSimulator';

interface RuleBuilderProps {
  initialRule?: Partial<JsonRuleAchievementData>;
  onChange: (rule: JsonRuleAchievementData, validation: RuleValidationResult) => void;
  disabled?: boolean;
}

export const RuleBuilder: React.FC<RuleBuilderProps> = ({
  initialRule,
  onChange,
  disabled = false,
}) => {
  const [rule, setRule] = useState<Partial<JsonRuleAchievementData>>({
    eventKeys: [],
    progress: {
      kind: 'count',
    },
    unlockWhen: {},
    counters: [],
    ...initialRule,
  });

  const [validation, setValidation] = useState<RuleValidationResult>({
    isValid: false,
    errors: ['Rule is incomplete'],
    warnings: [],
    estimatedComplexity: 'low',
  });

  const [isValidating, setIsValidating] = useState(false);

  // Debounced validation
  const validateRule = useCallback(
    async (ruleToValidate: Partial<JsonRuleAchievementData>) => {
      if (
        !ruleToValidate.eventKeys?.length ||
        !ruleToValidate.progress?.kind ||
        !ruleToValidate.unlockWhen ||
        Object.keys(ruleToValidate.unlockWhen).length === 0
      ) {
        setValidation({
          isValid: false,
          errors: ['Please complete all required fields'],
          warnings: [],
          estimatedComplexity: 'low',
        });
        return;
      }

      setIsValidating(true);
      try {
        const validationResult = await validateAchievementRule(
          ruleToValidate as JsonRuleAchievementData,
        );
        setValidation(validationResult);

        if (validationResult.isValid) {
          onChange(ruleToValidate as JsonRuleAchievementData, validationResult);
        }
      } catch (error) {
        setValidation({
          isValid: false,
          errors: ['Validation failed: ' + (error as Error).message],
          warnings: [],
          estimatedComplexity: 'low',
        });
      } finally {
        setIsValidating(false);
      }
    },
    [onChange],
  );

  // Auto-validate when rule changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      validateRule(rule);
    }, 500); // 500ms debounce

    return () => clearTimeout(timeoutId);
  }, [rule, validateRule]);

  const handleEventKeysChange = useCallback((eventKeys: string[]) => {
    setRule((prev) => ({ ...prev, eventKeys }));
  }, []);

  const handleProgressTypeChange = useCallback(
    (kind: JsonRuleAchievementData['progress']['kind']) => {
      setRule((prev) => ({
        ...prev,
        progress: {
          ...prev.progress,
          kind,
          // Reset conditions when changing progress type
          incrementIf: undefined,
          setIf: undefined,
          resetIf: kind === 'streak' ? {} : undefined, // Streak requires resetIf
        },
      }));
    },
    [],
  );

  const handleIncrementConditionChange = useCallback((incrementIf?: Record<string, unknown>) => {
    setRule((prev) => ({
      ...prev,
      progress: {
        ...prev.progress!,
        incrementIf,
      },
    }));
  }, []);

  const handleSetConditionChange = useCallback((setIf?: Record<string, unknown>) => {
    setRule((prev) => ({
      ...prev,
      progress: {
        ...prev.progress!,
        setIf,
      },
    }));
  }, []);

  const handleResetConditionChange = useCallback((resetIf?: Record<string, unknown>) => {
    setRule((prev) => ({
      ...prev,
      progress: {
        ...prev.progress!,
        resetIf,
      },
    }));
  }, []);

  const handleUnlockConditionChange = useCallback((unlockWhen: Record<string, unknown>) => {
    setRule((prev) => ({ ...prev, unlockWhen }));
  }, []);

  const handleCountersChange = useCallback((counters: string[]) => {
    setRule((prev) => ({ ...prev, counters }));
  }, []);

  // Calculate progress steps
  const getProgressSteps = () => {
    const hasEventKeys = rule.eventKeys && rule.eventKeys.length > 0;
    const hasProgressType = !!rule.progress?.kind;
    const hasProgressConditions = !!(
      rule.progress?.incrementIf ||
      rule.progress?.setIf ||
      rule.progress?.resetIf
    );
    const hasUnlockConditions = rule.unlockWhen && Object.keys(rule.unlockWhen).length > 0;

    return [
      {
        label: 'Event Keys',
        completed: hasEventKeys,
        hasError: !hasEventKeys && validation.errors.some((e) => e.toLowerCase().includes('event')),
      },
      {
        label: 'Progress Type',
        completed: hasProgressType,
        hasError:
          !hasProgressType && validation.errors.some((e) => e.toLowerCase().includes('progress')),
      },
      {
        label: 'Progress Conditions',
        completed: hasProgressConditions,
        hasWarning: hasProgressType && !hasProgressConditions,
      },
      {
        label: 'Unlock Conditions',
        completed: hasUnlockConditions,
        hasError:
          !hasUnlockConditions && validation.errors.some((e) => e.toLowerCase().includes('unlock')),
      },
      {
        label: 'Complete',
        completed: validation.isValid,
        hasError: !validation.isValid && validation.errors.length > 0,
      },
    ];
  };

  const getCurrentStep = () => {
    const steps = getProgressSteps();
    const firstIncompleteStep = steps.findIndex((step) => !step.completed);
    return firstIncompleteStep >= 0 ? firstIncompleteStep : steps.length - 1;
  };

  return (
    <div className="rule-builder-container space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-content">Achievement Rule Builder</h2>
        <ValidationFeedback
          validation={validation}
          isValidating={isValidating}
          compact={true}
          showDetails={false}
        />
      </div>

      {/* Progress Indicator */}
      <ProgressIndicator steps={getProgressSteps()} currentStep={getCurrentStep()} />

      {/* Real-time Validation Summary */}
      <ValidationFeedback validation={validation} isValidating={isValidating} showDetails={true} />

      {/* Event Selection */}
      <div className="bg-surface rounded-lg p-6 border border-border">
        <h3 className="text-lg font-medium text-content mb-4">Event Keys</h3>
        <p className="text-sm text-tertiary mb-4">
          Select which events will trigger this achievement's progress evaluation.
        </p>
        <EventSelector
          selectedEvents={rule.eventKeys || []}
          onEventsChange={handleEventKeysChange}
          disabled={disabled}
        />
      </div>

      {/* Progress Type */}
      <div className="bg-surface rounded-lg p-6 border border-border">
        <h3 className="text-lg font-medium text-content mb-4">Progress Type</h3>
        <p className="text-sm text-tertiary mb-4">
          Choose how progress is tracked for this achievement.
        </p>
        <ProgressTypeSelector
          selectedType={rule.progress?.kind || 'count'}
          onTypeChange={handleProgressTypeChange}
          disabled={disabled}
        />
      </div>

      {/* Progress Conditions */}
      <div className="bg-surface rounded-lg p-6 border border-border">
        <h3 className="text-lg font-medium text-content mb-4">Progress Conditions</h3>
        <p className="text-sm text-tertiary mb-4">
          Define when progress should increment, reset, or be set to a specific value.
        </p>

        <div className="space-y-4">
          {/* Increment Condition */}
          {(rule.progress?.kind === 'count' ||
            rule.progress?.kind === 'streak' ||
            rule.progress?.kind === 'binary') && (
            <ConditionBuilder
              type="incrementIf"
              label="Increment When"
              description="Progress increases when these conditions are met"
              condition={rule.progress.incrementIf}
              onConditionChange={handleIncrementConditionChange}
              disabled={disabled}
              required={rule.progress?.kind === 'binary'}
            />
          )}

          {/* Set Condition */}
          {(rule.progress?.kind === 'threshold' || rule.progress?.kind === 'binary') && (
            <ConditionBuilder
              type="setIf"
              label="Set Progress When"
              description="Set progress to a specific value when these conditions are met"
              condition={rule.progress.setIf}
              onConditionChange={handleSetConditionChange}
              disabled={disabled}
              required={rule.progress?.kind === 'threshold'}
            />
          )}

          {/* Reset Condition */}
          {rule.progress?.kind === 'streak' && (
            <ConditionBuilder
              type="resetIf"
              label="Reset When"
              description="Progress resets to 0 when these conditions are met"
              condition={rule.progress.resetIf}
              onConditionChange={handleResetConditionChange}
              disabled={disabled}
              required={true}
            />
          )}
        </div>
      </div>

      {/* Unlock Conditions */}
      <div className="bg-surface rounded-lg p-6 border border-border">
        <h3 className="text-lg font-medium text-content mb-4">Unlock Conditions</h3>
        <p className="text-sm text-tertiary mb-4">
          Define when the achievement should be awarded to the user.
        </p>
        <UnlockConditionBuilder
          condition={rule.unlockWhen || {}}
          onConditionChange={handleUnlockConditionChange}
          disabled={disabled}
        />
      </div>

      {/* Additional Counters */}
      <div className="bg-surface rounded-lg p-6 border border-border">
        <h3 className="text-lg font-medium text-content mb-4">Additional Counters</h3>
        <p className="text-sm text-tertiary mb-4">
          Optional: Track additional metrics alongside the main progress.
        </p>
        <CounterSelector
          selectedCounters={rule.counters || []}
          onCountersChange={handleCountersChange}
          disabled={disabled}
        />
      </div>

      {/* Rule Simulator */}
      {validation.isValid && (
        <div className="bg-surface rounded-lg p-6 border border-border">
          <RuleSimulator rule={rule as JsonRuleAchievementData} disabled={disabled} />
        </div>
      )}

      {/* Rule Preview */}
      <div className="bg-surface rounded-lg p-6 border border-border">
        <h3 className="text-lg font-medium text-content mb-4">Rule Preview</h3>
        <RulePreview rule={rule as JsonRuleAchievementData} validation={validation} />
      </div>
    </div>
  );
};
