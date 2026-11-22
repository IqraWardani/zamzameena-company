import type { ReactNode } from "react";

export function FormFieldLabel({
  htmlFor,
  required = false,
  showRequiredIndicator = true,
  children,
}: {
  htmlFor: string;
  required?: boolean;
  showRequiredIndicator?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="zas-form-field-label">
      <label htmlFor={htmlFor}>
        {children}
        {required && showRequiredIndicator && <> <span aria-hidden="true">*</span></>}
      </label>
    </div>
  );
}
