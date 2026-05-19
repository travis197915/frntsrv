import { createContext } from 'react';

interface FormPanelContextData {
  formState: {
    data: Record<string, unknown>;
    errors?: Record<string, string>;
  };
  formDispatch: (action: { type: string; payload?: unknown }) => void;
}

const FormPanelContext = createContext({} as FormPanelContextData);

export default FormPanelContext;
