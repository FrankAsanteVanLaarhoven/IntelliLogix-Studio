import { Injectable } from '@nestjs/common';

@Injectable()
export class UncertaintyEstimator {
  calculateDynamicEnvelope(
    observedVelocity: number,
    baseCovariance: number = 0.1,
    kappa: number = 0.35,
    currentTtc: number,
    processType: string
  ) {
    const sigmaPos = baseCovariance + kappa * Math.max(observedVelocity, 0);
    const riskFlags: string[] = [];

    if (currentTtc < 2.0) riskFlags.push('TTC_CRITICAL');
    if (sigmaPos > 1.5) riskFlags.push('HIGH_UNCERTAINTY');
    if (observedVelocity > 1.2) riskFlags.push('VELOCITY_ANOMALY');

    return {
      sigmaPos,
      ttcSeconds: currentTtc,
      velocityMagnitude: observedVelocity,
      riskFlags,
      safetyEnvelopeExpanded: sigmaPos > baseCovariance * 1.5,
      processKappaUsed: this.getProcessKappa(processType)
    };
  }

  private getProcessKappa(processType: string): number {
    const map: Record<string, number> = {
      'conveyor-belt': 0.45, 'dewatering-pumping': 0.6, 'wellhead-artificial-lift': 0.4,
      'crude-distillation': 0.55, 'robotic-cell': 0.3, 'fcc-blending': 0.5,
      'automotive-assembly': 0.35, 'mine-hoisting': 0.7, 'drilling-rig-bop': 0.8,
    };
    return map[processType] ?? 0.35;
  }
}
