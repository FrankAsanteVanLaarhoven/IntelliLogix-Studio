export const processes = [
  {id:'automotive-assembly',name:'Automotive Assembly',n:1,cat:'Manufacturing',desc:'Sequencing robots, conveyors, torque with cobot integration.',tags:['conveyor_speed','robot_torque'],mc:10,il:['e_stop','light_curtain'],kpi:{up:99.7,eff:85,oee:78},tw:'conveyor'},
  {id:'food-beverage',name:'Food & Beverage',n:2,cat:'Manufacturing',desc:'High-speed filling, capping, labeling with AI vision.',tags:['fill_flow','cap_torque'],mc:5,il:['overfill_esd'],kpi:{up:99.2,eff:88,oee:82},tw:'conveyor'},
  {id:'pharma-batch',name:'Pharma Batch',n:3,cat:'Manufacturing',desc:'ISA-88 batch with 21 CFR Part 11 compliance.',tags:['reactor_temp','dose_rate'],mc:2,il:['batch_safety'],kpi:{up:99.8,eff:80,oee:75},tw:'batch'},
  {id:'material-handling',name:'Material Handling',n:4,cat:'Manufacturing',desc:'Conveyor diverters, sorters, AS/RS swarm robotics.',tags:['sorter_speed'],mc:10,il:['collision_avoid'],kpi:{up:99.5,eff:90,oee:85},tw:'conveyor'},
  {id:'cnc-machine',name:'CNC Machine',n:5,cat:'Manufacturing',desc:'Auxiliary functions via Profinet.',tags:['aux_speed'],mc:5,il:['safety_door'],kpi:{up:99.6,eff:82,oee:77},tw:null},
  {id:'robotic-cell',name:'Robotic Cell',n:6,cat:'Manufacturing',desc:'Coordinated motion, AI path optimization.',tags:['path_override'],mc:8,il:['light_curtain','e_stop'],kpi:{up:99.4,eff:87,oee:80},tw:'robotic'},
  {id:'injection-molding',name:'Injection Molding',n:7,cat:'Manufacturing',desc:'Clamp, injection, cooling with pressure AI.',tags:['clamp_pressure'],mc:5,il:['clamp_position'],kpi:{up:99.3,eff:84,oee:79},tw:null},
  {id:'quality-vision',name:'Quality Vision',n:8,cat:'Manufacturing',desc:'Camera trigger and reject with edge AI.',tags:['reject_threshold'],mc:0,il:['vision_safety'],kpi:{up:99.9,eff:95,oee:93},tw:null},
  {id:'hvac',name:'HVAC Control',n:9,cat:'Manufacturing',desc:'Multi-zone PID with demand-response.',tags:['zone_temp'],mc:2,il:['smoke_detection'],kpi:{up:99.8,eff:78,oee:72},tw:'hvac'},
  {id:'energy-mgmt',name:'Energy Mgmt',n:10,cat:'Manufacturing',desc:'Load shedding, generator microgrid AI.',tags:['load_kw'],mc:10,il:['load_shed'],kpi:{up:99.9,eff:88,oee:85},tw:null},
  {id:'mining-conveyor',name:'Mining Conveyor',n:11,cat:'Mining',desc:'Start/stop with predictive belt-tear detection.',tags:['belt_speed','motor_current'],mc:10,il:['belt_tear','alignment'],kpi:{up:98.5,eff:80,oee:74},tw:'conveyor'},
  {id:'crushing-grinding',name:'Crushing & Grinding',n:12,cat:'Mining',desc:'Feed rate and crusher gap with twin.',tags:['feed_rate'],mc:15,il:['overload_trip'],kpi:{up:97.8,eff:76,oee:70},tw:null},
  {id:'mine-hoisting',name:'Mine Hoisting',n:13,cat:'Mining',desc:'SIL 3 redundant with rope wear prediction.',tags:['hoist_speed'],mc:0,il:['sil3','rope_wear'],kpi:{up:99.9,eff:92,oee:88},tw:null},
  {id:'mine-ventilation',name:'Ventilation',n:14,cat:'Mining',desc:'Fan speed with AI on-demand.',tags:['fan_speed','gas_ch4'],mc:10,il:['gas_esd'],kpi:{up:99.7,eff:75,oee:68},tw:'ventilation'},
  {id:'dewatering',name:'Dewatering',n:15,cat:'Mining',desc:'Level control with AI failure prediction.',tags:['pump_speed','sump_level'],mc:15,il:['dry_run'],kpi:{up:99.5,eff:82,oee:77},tw:'pump'},
  {id:'wellhead',name:'Wellhead Control',n:16,cat:'Upstream O&G',desc:'Valve, pump, ESD with MQTT telemetry.',tags:['choke_pos','pump_speed','tubing_pressure'],mc:15,il:['low_flow_esd','high_press_trip'],kpi:{up:98.2,eff:78,oee:72},tw:'wellhead'},
  {id:'drilling-rig',name:'Drilling Rig & BOP',n:17,cat:'Upstream O&G',desc:'Top-drive, mud pumps, BOP autonomous AI.',tags:['top_drive_rpm','bop_valve'],mc:0,il:['sil3_bop','esd'],kpi:{up:97.5,eff:70,oee:65},tw:null},
  {id:'gas-oil-sep',name:'Gas/Oil Separation',n:18,cat:'Upstream O&G',desc:'Three-phase separator control.',tags:['sep_level','sep_pressure'],mc:5,il:['high_level_trip'],kpi:{up:99.0,eff:83,oee:78},tw:'separator'},
  {id:'crude-distillation',name:'Crude Distillation',n:19,cat:'Downstream O&G',desc:'Furnace temp, column pressure, twin optimization.',tags:['furnace_temp','col_pressure','reflux_rate'],mc:8,il:['col_pressure_trip','furnace_high_temp'],kpi:{up:99.4,eff:86,oee:81},tw:'distillation'},
  {id:'fcc-blending',name:'FCC & Blending',n:20,cat:'Downstream O&G',desc:'Catalyst flow, reactor temp, blend AI.',tags:['cat_flow','reactor_temp','blend_ratio'],mc:5,il:['reactor_temp_trip'],kpi:{up:99.1,eff:84,oee:79},tw:'blending'}
];

export const learnItems = [
  {t:'What is a PLC?',s:['A PLC is the decision-making brain inside factory machines.','Born 1968 to replace relay cabinets. Now intelligent edge nodes.','2026: embedded AI, MQTT Sparkplug B, digital twins.','Try plcfiddle.com right now.']},
  {t:'Hardware',s:['CPU: S7-1500, ControlLogix, TwinCAT 3.','Inputs: Digital (0/1), Analog (4-20mA). Outputs to relays/valves.','Comms: Profinet, EtherNet/IP, OPC UA, MQTT.']},
  {t:'Languages',s:['Ladder Diagram: relay schematics. Most common.','FBD: graphical blocks. ST: text like Pascal.','SFC: state machines for ISA-88 batch.']},
  {t:'IIoT & Twins',s:['IIoT: sensors to cloud via edge gateways.','MQTT Sparkplug B = 2026 edge-to-cloud standard.','Digital Twin: virtual replica, simulate before deploy.']},
  {t:'Cybersecurity',s:['Zero-trust inside OT networks.','Segment OT from IT strictly.','MQTT over TLS, OPC UA X.509 certs.']},
  {t:'FleetSafe Uncertainty',s:['Dynamic envelope: sigma = base + kappa * velocity.','TTC (Time-To-Collision) bounds with predictive preemption.','Delay-robust CBF-QP with <10ms OSQP solve.','Process-specific kappa for all Top 20 processes.']}
];

export const UE = {
  kappa: {
    'automotive-assembly': 0.30, 'food-beverage': 0.25, 'pharma-batch': 0.20, 'material-handling': 0.35,
    'cnc-machine': 0.25, 'robotic-cell': 0.30, 'injection-molding': 0.28, 'quality-vision': 0.15,
    'hvac': 0.18, 'energy-mgmt': 0.22, 'mining-conveyor': 0.45, 'crushing-grinding': 0.50,
    'mine-hoisting': 0.60, 'mine-ventilation': 0.35, 'dewatering': 0.60, 'wellhead': 0.40,
    'drilling-rig': 0.65, 'gas-oil-sep': 0.38, 'crude-distillation': 0.55, 'fcc-blending': 0.42
  },
  sigmaBase: 0.10,
  ttcCritical: 2.0,
  sigmaCritical: 1.5,
  delayRobustDefault: 0.05,
  calc: function(vel, ttc, pid) {
    let k = this.kappa[pid] || 0.35;
    let sig = this.sigmaBase + k * Math.abs(vel);
    let flags = [];
    if (ttc < this.ttcCritical) flags.push('TTC_CRITICAL');
    if (sig > this.sigmaCritical) flags.push('HIGH_UNCERTAINTY');
    if (ttc < 5.0 && vel > 3.0) flags.push('APPROACHING_BOUNDARY');
    let safe = flags.length === 0 && ttc > 2.0 && sig < this.sigmaCritical;
    return {sigmaPos: sig, ttc: ttc, vel: vel, kappa: k, flags: flags, safe: safe, expanded: sig > this.sigmaBase * 1.5};
  },
  snapshot: function(pid) {
    let vel = parseFloat((Math.random() * 4).toFixed(2));
    let ttc = parseFloat((Math.random() * 8 + 0.5).toFixed(1));
    return this.calc(vel, ttc, pid);
  }
};

export const CategoryStyles = {
  'Manufacturing': { color: 'var(--ac)', bg: 'var(--acs)' },
  'Mining': { color: 'var(--wn)', bg: 'var(--wns)' },
  'Upstream O&G': { color: 'var(--inf)', bg: 'var(--infs)' },
  'Downstream O&G': { color: 'var(--dn)', bg: 'var(--dns)' }
};
