"use client";

import {
  useActionState,
  useEffect,
  useRef,
  type FormEvent,
  type Ref,
  type ReactNode,
} from "react";
import { useFormStatus } from "react-dom";

export type AdminActionFeedback = {
  error?: string;
  message?: string;
};

type PreservedActionOptions<State> = {
  isSuccess?: (state: State) => boolean;
  onSuccess?: () => void;
  resetOnSuccess?: boolean;
};

type FormAction<State> = (
  previousState: State,
  formData: FormData,
) => Promise<State>;

function snapshotForm(formData: FormData): Array<[string, string]> {
  return Array.from(formData.entries()).flatMap(([name, value]) =>
    typeof value === "string" ? [[name, value] as [string, string]] : [],
  );
}

function restoreForm(
  form: HTMLFormElement,
  values: Array<[string, string]>,
): void {
  const groupedValues = new Map<string, string[]>();
  for (const [name, value] of values) {
    const current = groupedValues.get(name) ?? [];
    current.push(value);
    groupedValues.set(name, current);
  }

  for (const element of Array.from(form.elements)) {
    if (
      !(element instanceof HTMLInputElement) &&
      !(element instanceof HTMLTextAreaElement) &&
      !(element instanceof HTMLSelectElement)
    ) {
      continue;
    }

    const savedValues = groupedValues.get(element.name);
    if (!savedValues) continue;

    if (element instanceof HTMLInputElement && ["checkbox", "radio"].includes(element.type)) {
      element.checked = savedValues.includes(element.value);
    } else if (element instanceof HTMLSelectElement && element.multiple) {
      for (const option of Array.from(element.options)) {
        option.selected = savedValues.includes(option.value);
      }
    } else {
      element.value = savedValues[0];
    }
  }
}

function isNextNavigationSignal(error: unknown): boolean {
  if (!error || typeof error !== "object" || !("digest" in error)) return false;
  const digest = error.digest;
  return (
    typeof digest === "string" &&
    (digest.startsWith("NEXT_REDIRECT;") ||
      digest.startsWith("NEXT_HTTP_ERROR_FALLBACK;"))
  );
}

export function usePreservedActionState<
  State extends AdminActionFeedback & { then?: never },
>(
  action: FormAction<State>,
  initialState: NoInfer<State>,
  options: PreservedActionOptions<State> = {},
): {
  state: State;
  formAction: (formData: FormData) => void;
  pending: boolean;
  formRef: Ref<HTMLFormElement>;
  handleSubmit: (event: FormEvent<HTMLFormElement>) => void;
} {
  const submittedValues = useRef<Array<[string, string]> | null>(null);
  const formElement = useRef<HTMLFormElement>(null);
  const previousState = useRef(initialState);
  const guardedAction: FormAction<State> = async (previous, formData) => {
    try {
      return await action(previous, formData);
    } catch (error) {
      if (isNextNavigationSignal(error)) throw error;
      console.error("Admin action request failed.", error);
      return {
        ...initialState,
        error: "Permintaan gagal diproses. Data tetap tersimpan di form; periksa koneksi lalu coba lagi.",
      } as State;
    }
  };
  const reactAction = (
    previousState: Awaited<State>,
    formData: FormData,
  ) => guardedAction(previousState as State, formData);
  const [state, formAction, pending] = useActionState(
    reactAction,
    initialState as Awaited<State>,
  );

  useEffect(() => {
    if (previousState.current === state) return;
    previousState.current = state;
    const values = submittedValues.current;
    if (!values) return;

    const isSuccess =
      options.isSuccess?.(state) ??
      !("error" in state && typeof state.error === "string");
    if (isSuccess) {
      if (options.resetOnSuccess !== false) formElement.current?.reset();
      submittedValues.current = null;
      options.onSuccess?.();
      return;
    }

    if (formElement.current) restoreForm(formElement.current, values);
  }, [options, state]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    const submitter = (event.nativeEvent as SubmitEvent).submitter;
    const formData =
      submitter instanceof HTMLElement && submitter instanceof HTMLButtonElement
        ? new FormData(event.currentTarget, submitter)
        : new FormData(event.currentTarget);
    submittedValues.current = snapshotForm(formData);
  }

  return {
    state,
    formAction,
    pending,
    formRef: formElement,
    handleSubmit,
  };
}

export function AdminFieldError({
  id,
  message,
}: {
  id: string;
  message?: string;
}) {
  if (!message) return null;
  return (
    <p className="zas-admin-field-error" id={`${id}-error`} role="alert">
      {message}
    </p>
  );
}

export function fieldA11yProps(id: string, message?: string) {
  return {
    "aria-invalid": message ? true : undefined,
    "aria-describedby": message ? `${id}-error` : undefined,
  };
}

export function AdminPendingButton({
  children,
  pendingLabel,
  className,
}: {
  children: ReactNode;
  pendingLabel: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button className={className} disabled={pending} type="submit">
      {pending ? pendingLabel : children}
    </button>
  );
}
