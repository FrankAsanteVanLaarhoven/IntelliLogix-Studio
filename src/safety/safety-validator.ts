import { Injectable, BadRequestException } from '@nestjs/common';
import { UncertaintyEstimator } from './uncertainty-estimator';
import { SetpointProposal } from '../schemas/proposal.schema';

@Injectable()
export class SafetyValidator {
  constructor(private readonly uncertaintyEstimator: UncertaintyEstimator) {}

  validateProposal(proposal: SetpointProposal, currentSnapshot: any, processType: string): boolean {
    // ... (all previous global + process-specific checks remain)

    // NEW: FleetSafe-VLA Uncertainty Check
    const uncertainty = this.uncertaintyEstimator.calculateDynamicEnvelope(
      currentSnapshot.velocity || 0,
      0.1,
      undefined,
      proposal.uncertaintyEstimation?.ttcSeconds ?? 5,
      processType
    );

    if (uncertainty.riskFlags.length > 0) {
      throw new BadRequestException(`Uncertainty violation: ${uncertainty.riskFlags.join(', ')}`);
    }
    if (!proposal.constraintsRespected || uncertainty.safetyEnvelopeExpanded === false) {
      throw new BadRequestException('FleetSafe-VLA envelope violated');
    }

    return true;
  }
}
