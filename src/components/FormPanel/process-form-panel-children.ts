import { Children, cloneElement, isValidElement, useId } from 'react';
import type { ReactElement, ReactNode } from 'react';

export const getFormInputElements = (children: ReactNode): ReactElement[] => {
  const formInputElements: ReactElement[] = [];
  Children.forEach(children, (child) => {
    if (isValidElement(child)) {
      const element = child as ReactElement<{ children?: ReactNode }>;
      if (element.props.children) {
        formInputElements.push(...getFormInputElements(element.props.children));
      } else {
        formInputElements.push(element);
      }
    }
  });
  return formInputElements;
};

export const getReactElementClones = (
  children: ReactNode,
  readOnlyMode?: boolean
): ReactElement[] => {
  const reactElementClones: ReactElement[] = [];
  Children.forEach(children, (child) => {
    if (isValidElement(child)) {
      const element = child as ReactElement<{ children?: ReactNode; readOnlyMode?: boolean }>;
      reactElementClones.push(
        cloneElement(element, {
          readOnlyMode,
          children: element.props.children
            ? getReactElementClones(element.props.children, readOnlyMode)
            : undefined,
          key: useId(),
        })
      );
    } else {
      reactElementClones.push(child as unknown as ReactElement);
    }
  });
  return reactElementClones;
};
