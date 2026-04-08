export class LadderEngine {
  constructor() {
    this.memory = {}; 
    this.rungs = []; 
  }

  setTag(id, value) {
    this.memory[id] = value;
  }

  getTag(id) {
    return !!this.memory[id];
  }

  load({ memory, rungs }) {
    this.memory = { ...memory };
    this.rungs = rungs || [];
  }

  evaluateElement(el, powerFlow, updatedMemory, dt) {
    let nodePower = false;
    let powerOut = powerFlow; // defaults to passing power forward smoothly unless blocked

    const tagVal = !!updatedMemory[el.tag];

    if (el.type === 'NO') {
      nodePower = powerFlow && tagVal;
      powerOut = nodePower;
    } else if (el.type === 'NC') {
      nodePower = powerFlow && !tagVal;
      powerOut = nodePower;
    } else if (el.type === 'ONS') {
      const stateTag = `${el.tag}_ONS_STATE`;
      const prev = !!updatedMemory[stateTag];
      updatedMemory[stateTag] = powerFlow;
      nodePower = powerFlow && !prev;
      powerOut = nodePower;
    } else if (el.type === 'COIL') {
      nodePower = powerFlow;
      updatedMemory[el.tag] = powerFlow; 
    } else if (el.type === 'OTL') {
      nodePower = powerFlow;
      if (powerFlow) updatedMemory[el.tag] = true;
    } else if (el.type === 'OTU') {
      nodePower = powerFlow;
      if (powerFlow) updatedMemory[el.tag] = false;
    } else if (el.type === 'TON' || el.type === 'TOF' || el.type === 'RTO') {
      const accTag = `${el.tag}_ACC`;
      const preTag = `${el.tag}_PRE`;
      const dnTag  = `${el.tag}_DN`;
      const enTag  = `${el.tag}_EN`;
      const ttTag  = `${el.tag}_TT`;

      if (updatedMemory[accTag] === undefined) updatedMemory[accTag] = 0;
      if (updatedMemory[preTag] === undefined) updatedMemory[preTag] = 5000;

      if (el.type === 'TON') {
        updatedMemory[enTag] = powerFlow;
        if (powerFlow) {
          updatedMemory[accTag] = Math.min(updatedMemory[preTag], updatedMemory[accTag] + dt);
          if (updatedMemory[accTag] >= updatedMemory[preTag]) {
            updatedMemory[dnTag] = true;
            updatedMemory[ttTag] = false;
            nodePower = true;
          } else {
            updatedMemory[dnTag] = false;
            updatedMemory[ttTag] = true;
            nodePower = false;
          }
        } else {
          updatedMemory[accTag] = 0;
          updatedMemory[dnTag] = false;
          updatedMemory[ttTag] = false;
          nodePower = false;
        }
      } else if (el.type === 'TOF') {
        updatedMemory[enTag] = powerFlow;
        if (powerFlow) {
           updatedMemory[accTag] = 0;
           updatedMemory[dnTag] = true;
           updatedMemory[ttTag] = false;
           nodePower = true;
        } else {
           if (updatedMemory[dnTag]) {
              updatedMemory[accTag] = Math.min(updatedMemory[preTag], updatedMemory[accTag] + dt);
              updatedMemory[ttTag] = true;
              if (updatedMemory[accTag] >= updatedMemory[preTag]) {
                 updatedMemory[dnTag] = false;
                 updatedMemory[ttTag] = false;
              }
           }
           nodePower = updatedMemory[dnTag];
        }
      } else if (el.type === 'RTO') {
        updatedMemory[enTag] = powerFlow;
        if (powerFlow) {
           if (updatedMemory[accTag] < updatedMemory[preTag]) {
              updatedMemory[accTag] = Math.min(updatedMemory[preTag], updatedMemory[accTag] + dt);
              updatedMemory[ttTag] = true;
           } else {
              updatedMemory[ttTag] = false;
           }
           
           if (updatedMemory[accTag] >= updatedMemory[preTag]) {
              updatedMemory[dnTag] = true;
              nodePower = true;
           } else {
              nodePower = false;
           }
        } else {
           updatedMemory[ttTag] = false;
           nodePower = updatedMemory[dnTag];
        }
      }
      powerOut = nodePower;
    } else if (el.type === 'CTU' || el.type === 'CTD') {
      const accTag = `${el.tag}_ACC`;
      const preTag = `${el.tag}_PRE`;
      const dnTag  = `${el.tag}_DN`;
      const pTag   = `${el.tag}_P`; // Previous execution state
      
      if (updatedMemory[accTag] === undefined) updatedMemory[accTag] = 0;
      if (updatedMemory[preTag] === undefined) updatedMemory[preTag] = 10;
      
      const prevEn = !!updatedMemory[pTag];
      updatedMemory[pTag] = powerFlow;

      if (el.type === 'CTU') {
         if (powerFlow && !prevEn) updatedMemory[accTag] += 1;
      } else {
         if (powerFlow && !prevEn) updatedMemory[accTag] -= 1;
      }
      
      updatedMemory[dnTag] = updatedMemory[accTag] >= updatedMemory[preTag];
      nodePower = powerFlow;
      powerOut = powerFlow;
    } else if (el.type === 'RES') {
      nodePower = powerFlow;
      if (powerFlow && el.tag) {
         updatedMemory[`${el.tag}_ACC`] = 0;
         updatedMemory[`${el.tag}_DN`] = false;
         updatedMemory[`${el.tag}_TT`] = false;
         updatedMemory[`${el.tag}_EN`] = false;
         updatedMemory[`${el.tag}_P`] = false;
      }
      powerOut = powerFlow;
    } else if (['ADD', 'SUB', 'MUL', 'DIV'].includes(el.type)) {
       nodePower = powerFlow; 
       const srcA = el.tagA;
       const srcB = el.tagB;
       const dest = el.tagDest;
       if (srcA && updatedMemory[srcA] === undefined) updatedMemory[srcA] = 0;
       if (srcB && updatedMemory[srcB] === undefined) updatedMemory[srcB] = 0;
       if (powerFlow && srcA && srcB && dest) {
          const valA = Number(updatedMemory[srcA]) || 0;
          const valB = Number(updatedMemory[srcB]) || 0;
          if (el.type === 'ADD') updatedMemory[dest] = valA + valB;
          if (el.type === 'SUB') updatedMemory[dest] = valA - valB;
          if (el.type === 'MUL') updatedMemory[dest] = valA * valB;
          if (el.type === 'DIV') updatedMemory[dest] = valB !== 0 ? valA / valB : 0;
       }
       powerOut = powerFlow;
    } else if (el.type === 'MOV') {
       nodePower = powerFlow;
       const srcA = el.tagA;
       const dest = el.tagDest;
       if (srcA && updatedMemory[srcA] === undefined) updatedMemory[srcA] = 0;
       if (powerFlow && srcA && dest) {
          updatedMemory[dest] = updatedMemory[srcA];
       }
       powerOut = powerFlow;
    } else if (['EQU', 'NEQ', 'GRT', 'GEQ', 'LES', 'LEQ'].includes(el.type)) {
       const srcA = el.tagA;
       const srcB = el.tagB;
       if (srcA && updatedMemory[srcA] === undefined) updatedMemory[srcA] = 0;
       if (srcB && updatedMemory[srcB] === undefined) updatedMemory[srcB] = 0;
       
       let isTrue = false;
       if (srcA && srcB) {
         const valA = Number(updatedMemory[srcA]) || 0;
         const valB = Number(updatedMemory[srcB]) || 0;
         if (el.type === 'EQU') isTrue = (valA === valB);
         if (el.type === 'NEQ') isTrue = (valA !== valB);
         if (el.type === 'GRT') isTrue = (valA > valB);
         if (el.type === 'GEQ') isTrue = (valA >= valB);
         if (el.type === 'LES') isTrue = (valA < valB);
         if (el.type === 'LEQ') isTrue = (valA <= valB);
       }
       nodePower = powerFlow && isTrue;
       powerOut = nodePower;
    } else {
      nodePower = false;
      powerOut = false;
    }

    return { nodePower, powerOut };
  }

  evaluatePath(elements, incomingPower, updatedMemory, dt) {
    let currentPower = incomingPower;
    const elementFlows = []; // the evaluated structural data used for rendering UI traces

    for (const el of elements) {
      if (el.type === 'BRANCH') {
         const branchResults = [];
         let anyPathOutPassed = false;
         
         // Evaluate all parallel nested paths independently given the incoming power to the branch root
         for (const path of el.paths) {
            const result = this.evaluatePath(path, currentPower, updatedMemory, dt);
            branchResults.push(result);
            if (result.powerOut) anyPathOutPassed = true;
         }
         
         // Power continuing past the parallel branch is TRUE if any of its subpaths yield TRUE
         currentPower = currentPower && anyPathOutPassed; 
         
         // Provide detailed structural render trace block for UI
         elementFlows.push({
           id: el.id,
           type: 'BRANCH',
           nodePower: currentPower,
           paths: branchResults
         });
      } else {
         const res = this.evaluateElement(el, currentPower, updatedMemory, dt);
         currentPower = res.powerOut;
         
         elementFlows.push({
           id: el.id,
           type: el.type,
           nodePower: res.nodePower
         });
      }
    }

    return {
      powerOut: currentPower,
      elementFlows: elementFlows
    };
  }

  evaluate(dt = 100) {
    const updatedMemory = { ...this.memory };
    const rungEnergizedPaths = []; 

    for (const rung of this.rungs) {
      // Each rung acts as a root path starting with absolute power (true)
      const res = this.evaluatePath(rung.elements, true, updatedMemory, dt);
      
      rungEnergizedPaths.push({
        rungId: rung.id,
        energized: res.powerOut,
        elements: res.elementFlows
      });
    }

    this.memory = updatedMemory;

    return {
      memory: this.memory,
      powerFlows: rungEnergizedPaths
    };
  }
}
