import React, { createContext, useContext, useState, useCallback } from 'react';

const BackplaneContext = createContext();

export const BackplaneProvider = ({ children }) => {
  const [globalMemory, setGlobalMemory] = useState({
    'Estop_OK': true,
    'Doors_Closed': true,
    'System_Ready': false,
    'Start_Button': false,
    'Motor_Cmd': false,
    'Motor_Aux': false,
    'System_Faulted': false
  });

  const [tagDefinitions, setTagDefinitions] = useState({
    'Estop_OK': 'Boolean',
    'Doors_Closed': 'Boolean',
    'System_Ready': 'Boolean',
    'Start_Button': 'Boolean',
    'Motor_Cmd': 'Boolean',
    'Motor_Aux': 'Boolean',
    'System_Faulted': 'Boolean',
    'Fault_Timer': 'Timer'
  });

  const updateMemory = useCallback((tag, value) => {
    setGlobalMemory(prev => {
      if (prev[tag] === value) return prev;
      return { ...prev, [tag]: value };
    });
  }, []);

  return (
    <BackplaneContext.Provider value={{ globalMemory, setGlobalMemory, updateMemory, tagDefinitions, setTagDefinitions }}>
      {children}
    </BackplaneContext.Provider>
  );
};

export const useBackplane = () => useContext(BackplaneContext);
