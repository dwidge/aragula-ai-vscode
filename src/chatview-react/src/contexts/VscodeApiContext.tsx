import React, { createContext, ReactNode, useContext } from "react";

interface VscodeApi {
  postMessage: (message: object) => void;
}

const VscodeApiContext = createContext<VscodeApi | undefined>(undefined);

export const useVscodeApi = () => {
  const context = useContext(VscodeApiContext);
  if (context === undefined) {
    throw new Error("useVscodeApi must be used within a VscodeApiProvider");
  }
  return context;
};

interface VscodeApiProviderProps {
  children: ReactNode;
  value: VscodeApi;
}

export const VscodeApiProvider: React.FC<VscodeApiProviderProps> = ({
  children,
  value,
}) => {
  return (
    <VscodeApiContext.Provider value={value}>
      {children}
    </VscodeApiContext.Provider>
  );
};
