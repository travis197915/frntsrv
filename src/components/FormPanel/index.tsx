import { Children, isValidElement, useReducer } from 'react';
import type { Dispatch, FC, ReactElement, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { compareValues } from '@/utils/compare-values';
import { ErrorAlert } from '@/components/ErrorAlert';
import { Button } from '@/components/ui/button';
import FormInput from './FormInput';
import FormPanelContext from './form-panel-context';
import reducer from './form-panel-reducer';
import type {
  ActionType,
  ResetFormActionType,
  UpdateErrorsActionType,
} from './form-panel-reducer';
import { getFormInputElements, getReactElementClones } from './process-form-panel-children';
import validate from './validators';

type ConditionsToShow = {
  matches: { field: string; condition: '===' | '!=='; value: string }[];
  type?: 'every' | 'some';
};

function getInitialDataAndValidatorsFromChildren(
  children: ReactNode
): [Record<string, unknown>, Record<string, unknown>, Record<string, ConditionsToShow | undefined>] {
  let initialData: Record<string, unknown> = {};
  let validators: Record<string, unknown> = {};
  let conditionsToShow: Record<string, ConditionsToShow | undefined> = {};
  Children.forEach(children, (element) => {
    if (!isValidElement(element)) return;
    const p = element.props as { fieldName?: string; defaultValue?: unknown; validators?: unknown; conditionsToShow?: ConditionsToShow };
    if (p.fieldName !== undefined) {
      initialData = { ...initialData, [p.fieldName]: p.defaultValue };
      validators = { ...validators, [p.fieldName]: p.validators };
      conditionsToShow = { ...conditionsToShow, [p.fieldName]: p.conditionsToShow };
    }
  });
  return [initialData, validators, conditionsToShow];
}

function shouldHideFormInput(
  conditionsToShow: ConditionsToShow | undefined,
  formData: Record<string, unknown>
): boolean {
  if (!conditionsToShow?.matches?.length) return false;
  if (conditionsToShow.type === 'some') {
    return !conditionsToShow.matches.some((c) =>
      compareValues(formData[c.field], c.condition, c.value)
    );
  }
  return !conditionsToShow.matches.every((c) =>
    compareValues(formData[c.field], c.condition, c.value)
  );
}

type FormPanelBaseProps = {
  children: ReactElement | ReactElement[];
  onSubmit: (data: Record<string, unknown>) => void;
  loading: boolean;
  error: string | undefined;
  cancelButtonLabel?: string;
  submitButtonLabel?: string;
  buttonRef?: React.RefObject<{
    submit: () => void;
    cancel: () => void;
    reset?: () => void;
  }>;
  className?: string;
};

function useFormPanelLogic(children: ReactElement | ReactElement[]) {
  const formInputElements = getFormInputElements(children);
  const reactElementClones = getReactElementClones(children);
  const [initialData, validators, conditionsToShow] =
    getInitialDataAndValidatorsFromChildren(formInputElements);

  const [formState, formDispatch] = useReducer(reducer, { data: initialData });
  const formContext = { formState, formDispatch };

  function validateForm() {
    const errors: Record<string, string> = {};
    Object.keys(formState.data).forEach((f) => {
      const v = validators[f];
      if (v && !shouldHideFormInput(conditionsToShow[f], formState.data)) {
        const err = validate(v as Parameters<typeof validate>[0], formState, formState.data[f]);
        if (err) errors[f] = err;
      }
    });
    return errors;
  }

  return {
    reactElementClones,
    initialData,
    formState,
    formDispatch,
    formContext,
    validateForm,
  };
}

const FormPanel: FC<
  FormPanelBaseProps & {
    onCancel?: () => void;
    onReset?: () => void;
  }
> = ({ className, ...props }) => {
  const {
    reactElementClones,
    initialData,
    formState,
    formDispatch,
    formContext,
    validateForm,
  } = useFormPanelLogic(props.children);

  const updateErrorsDispatch = formDispatch as Dispatch<ActionType & UpdateErrorsActionType>;
  const resetFormDispatch = formDispatch as Dispatch<ActionType & ResetFormActionType>;

  function handleSubmit() {
    const errors = validateForm();
    updateErrorsDispatch({ type: 'UPDATE_ERRORS', payload: { errors } });
    if (Object.keys(errors).length < 1) {
      props.onSubmit(formState.data);
    }
  }

  function handleCancel() {
    props.onCancel?.();
  }

  function handleReset() {
    resetFormDispatch({ type: 'RESET_FORM', payload: { initialData } });
    props.onReset?.();
  }

  if (props.buttonRef) {
    props.buttonRef.current = { submit: handleSubmit, cancel: handleCancel, reset: handleReset };
  }

  function formActions() {
    if (props.buttonRef) return null;
    return (
      <div className="col-span-full mt-5 flex flex-col gap-2 sm:flex-row">
        <Button loading={props.loading} onClick={handleSubmit} className="w-full">
          {props.submitButtonLabel ?? 'Submit'}
        </Button>
        {props.onCancel && (
          <Button onClick={handleCancel} variant="secondary" className="w-full sm:w-auto">
            {props.cancelButtonLabel ?? 'Cancel'}
          </Button>
        )}
        {props.onReset && (
          <Button onClick={handleReset} variant="outline" className="w-full sm:w-auto">
            Reset
          </Button>
        )}
      </div>
    );
  }

  return (
    <FormPanelContext.Provider value={formContext}>
      <div className={cn('min-w-0 grid grid-cols-1 gap-5 sm:grid-cols-6', className)}>
        {reactElementClones}
      </div>
      {props.error && (
        <div className="mb-4">
          <ErrorAlert error={props.error} />
        </div>
      )}
      {formActions()}
    </FormPanelContext.Provider>
  );
};

export { FormPanel, FormInput };
