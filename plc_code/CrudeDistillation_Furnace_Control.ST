// CrudeDistillation_Furnace_Control.ST
FUNCTION_BLOCK FB_FurnaceControl
VAR_INPUT
  currentTemp: REAL;          // °C
  velocityFactor: REAL;       // from IIoT / vision (m/s equivalent disturbance)
  ttcSeconds: REAL;           // from UncertaintyEstimator
END_VAR
VAR_OUTPUT
  safeSetpoint: REAL;
  safetyStatus: STRING;
END_VAR
VAR
  maxChangeC: REAL := 8.0;
  baseCov: REAL := 0.1;
  kappa: REAL := 0.55;        // process-specific for distillation
  sigmaPos: REAL;
END_VAR

// FleetSafe-VLA envelope calculation
sigmaPos := baseCov + kappa * velocityFactor;

// Safety decision
IF (ttcSeconds < 2.0) OR (sigmaPos > 1.5) THEN
  safeSetpoint := currentTemp;                 // freeze
  safetyStatus := 'FLEETSAFE_VLA_BLOCKED';
ELSE
  safeSetpoint := LIMIT(currentTemp - maxChangeC, currentTemp + maxChangeC, 320.0);
  safetyStatus := 'SAFE_SETPOINT_APPROVED';
END_IF;

END_FUNCTION_BLOCK
