export interface ActionType {
  type: string;
}

export interface UpdateStateActionType extends ActionType {
  payload: {
    fieldName: string;
    value: unknown;
  };
}

export interface UpdateErrorsActionType extends ActionType {
  payload: {
    errors: Record<string, string>;
  };
}

export interface ResetFormActionType extends ActionType {
  payload: {
    initialData: Record<string, unknown>;
  };
}

function isUpdateStateAction(action: ActionType): action is UpdateStateActionType {
  return action.type === 'UPDATE_STATE';
}

function isUpdateErrorsAction(action: ActionType): action is UpdateErrorsActionType {
  return action.type === 'UPDATE_ERRORS';
}

function isResetFormAction(action: ActionType): action is ResetFormActionType {
  return action.type === 'RESET_FORM';
}

const reducer = (state: { data: Record<string, unknown>; errors?: Record<string, string> }, action: ActionType) => {
  if (isUpdateStateAction(action)) {
    return {
      ...state,
      data: { ...state.data, [action.payload.fieldName]: action.payload.value },
    };
  }
  if (isUpdateErrorsAction(action)) {
    return {
      ...state,
      errors: action.payload.errors,
    };
  }
  if (isResetFormAction(action)) {
    return {
      ...state,
      data: action.payload.initialData,
    };
  }
  return state;
};

export default reducer;
