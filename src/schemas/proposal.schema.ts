import { z } from 'zod';

export const SetpointProposalSchema = z.object({
  kind: z.literal("SET_PARAM"),
  targetTag: z.string().min(1).max(120),
  proposedValue: z.number(),
  reason: z.string().min(10).max(512),
  constraintsRespected: z.literal(true),

  safetyRiskLevel: z.enum(["NONE", "LOW", "MEDIUM", "HIGH"]).default("NONE"),
  affectedInterlocks: z.array(z.string()).default([]),
  maxAllowedDeviationPercent: z.number().min(0).max(100).default(5),
  expectedKpiImpact: z.object({ uptimeImpactPercent: z.number().optional(), efficiencyGainPercent: z.number().optional(), energySavingPercent: z.number().optional(), safetyMarginRemaining: z.number().optional() }).optional(),

  processContext: z.object({ processType: z.string(), currentValue: z.number().optional(), engineeringUnits: z.string().optional() }).optional(),

  digitalTwinPrediction: z.object({ predictedOutcome: z.string(), riskFlags: z.array(z.string()), confidence: z.number().min(0).max(1) }).optional(),

  // === FLEETSAFE-VLA UNCERTAINTY ESTIMATION LAYER ===
  uncertaintyEstimation: z.object({
    ttcSeconds: z.number().min(0).optional(),
    positionalCovariance: z.number().min(0).optional(),
    velocityMagnitude: z.number().min(0).optional(),
    riskFlags: z.array(z.string()).default([]),
  }).optional(),

  delayRobustMargin: z.number().min(0).default(0.05),
});

export type SetpointProposal = z.infer<typeof SetpointProposalSchema>;
