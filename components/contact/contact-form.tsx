"use client";

import { useRef, useState, type FormEvent } from "react";
import { contactInfo } from "@/lib/contact-info";

type ContactFields = {
  firstName: string;
  lastName: string;
  email: string;
  subject: string;
  message: string;
  agreedToTerms: boolean;
  website: string;
};

type ContactFieldName = keyof Omit<ContactFields, "website">;
type ContactErrors = Partial<Record<ContactFieldName, string>>;

const initialFields: ContactFields = {
  firstName: "",
  lastName: "",
  email: "",
  subject: "",
  message: "",
  agreedToTerms: false,
  website: "",
};

function validateFields(fields: ContactFields): ContactErrors {
  const errors: ContactErrors = {};
  const firstName = fields.firstName.trim();
  const lastName = fields.lastName.trim();
  const email = fields.email.trim();
  const subject = fields.subject.trim();
  const message = fields.message.trim();

  if (!firstName || firstName.length > 60) {
    errors.firstName = "Please enter a first name (up to 60 characters).";
  }
  if (!lastName || lastName.length > 60) {
    errors.lastName = "Please enter a last name (up to 60 characters).";
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = "Please enter a valid email address.";
  }
  if (subject.length < 3 || subject.length > 120) {
    errors.subject = "Subject must be between 3 and 120 characters.";
  }
  if (message.length < 10 || message.length > 2000) {
    errors.message = "Message must be between 10 and 2,000 characters.";
  }
  if (!fields.agreedToTerms) {
    errors.agreedToTerms = "Please agree to the terms and privacy policy.";
  }

  return errors;
}

export function ContactForm() {
  const [fields, setFields] = useState(initialFields);
  const [errors, setErrors] = useState<ContactErrors>({});
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string }>();
  const [isSending, setIsSending] = useState(false);
  const firstNameRef = useRef<HTMLInputElement>(null);
  const lastNameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const subjectRef = useRef<HTMLInputElement>(null);
  const messageRef = useRef<HTMLTextAreaElement>(null);
  const termsRef = useRef<HTMLInputElement>(null);

  const updateField = <K extends keyof ContactFields>(name: K, value: ContactFields[K]) => {
    setFields((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: undefined }));
    setStatus(undefined);
  };

  const focusFirstError = (nextErrors: ContactErrors) => {
    const firstInvalidField = (
      ["firstName", "lastName", "email", "subject", "message", "agreedToTerms"] as const
    ).find((name) => nextErrors[name]);

    switch (firstInvalidField) {
      case "firstName":
        firstNameRef.current?.focus();
        break;
      case "lastName":
        lastNameRef.current?.focus();
        break;
      case "email":
        emailRef.current?.focus();
        break;
      case "subject":
        subjectRef.current?.focus();
        break;
      case "message":
        messageRef.current?.focus();
        break;
      case "agreedToTerms":
        termsRef.current?.focus();
        break;
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors = validateFields(fields);
    setErrors(nextErrors);
    setStatus(undefined);

    if (Object.keys(nextErrors).length > 0) {
      focusFirstError(nextErrors);
      return;
    }

    setIsSending(true);
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: fields.firstName.trim(),
          lastName: fields.lastName.trim(),
          email: fields.email.trim(),
          subject: fields.subject.trim(),
          message: fields.message.trim(),
          agreedToTerms: fields.agreedToTerms,
          website: fields.website,
        }),
      });

      if (!response.ok) throw new Error("Contact request failed");
      setFields(initialFields);
      setErrors({});
      setStatus({
        type: "success",
        message: "Thank you, we'll get back to you soon.",
      });
    } catch {
      setStatus({
        type: "error",
        message: "We couldn't send your message. Please try again in a little while.",
      });
    } finally {
      setIsSending(false);
    }
  };

  const errorMessage = (name: ContactFieldName) =>
    errors[name] ? (
      <span className="zas-contact-error" id={`contact-${name}-error`}>
        {errors[name]}
      </span>
    ) : null;

  return (
    <div className="zas-contact-form-wrap" id="contact-form">
      <h2>Get in Touch</h2>
      <form className="zas-contact-form" noValidate onSubmit={handleSubmit}>
        <div className="zas-contact-name-row">
          <div className="zas-contact-field">
            <label className="zas-contact-visually-hidden" htmlFor="contact-first-name">
              First Name
            </label>
            <input
              autoComplete="given-name"
              id="contact-first-name"
              maxLength={60}
              name="firstName"
              onChange={(event) => updateField("firstName", event.target.value)}
              placeholder="First Name"
              ref={firstNameRef}
              aria-invalid={Boolean(errors.firstName)}
              aria-describedby={errors.firstName ? "contact-firstName-error" : undefined}
              value={fields.firstName}
            />
            {errorMessage("firstName")}
          </div>
          <div className="zas-contact-field">
            <label className="zas-contact-visually-hidden" htmlFor="contact-last-name">
              Last Name
            </label>
            <input
              autoComplete="family-name"
              id="contact-last-name"
              maxLength={60}
              name="lastName"
              onChange={(event) => updateField("lastName", event.target.value)}
              placeholder="Last Name"
              ref={lastNameRef}
              aria-invalid={Boolean(errors.lastName)}
              aria-describedby={errors.lastName ? "contact-lastName-error" : undefined}
              value={fields.lastName}
            />
            {errorMessage("lastName")}
          </div>
        </div>

        <div className="zas-contact-field">
          <label className="zas-contact-visually-hidden" htmlFor="contact-email">
            Email Address
          </label>
          <input
            autoComplete="email"
            id="contact-email"
            maxLength={254}
            name="email"
            onChange={(event) => updateField("email", event.target.value)}
            placeholder="Email Address"
            ref={emailRef}
            type="email"
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? "contact-email-error" : undefined}
            value={fields.email}
          />
          {errorMessage("email")}
        </div>

        <div className="zas-contact-field">
          <label className="zas-contact-visually-hidden" htmlFor="contact-subject">
            Subject Line
          </label>
          <input
            id="contact-subject"
            maxLength={120}
            name="subject"
            onChange={(event) => updateField("subject", event.target.value)}
            placeholder="Subject Line"
            ref={subjectRef}
            aria-invalid={Boolean(errors.subject)}
            aria-describedby={errors.subject ? "contact-subject-error" : undefined}
            value={fields.subject}
          />
          {errorMessage("subject")}
        </div>

        <div className="zas-contact-field">
          <label className="zas-contact-visually-hidden" htmlFor="contact-message">
            Drop Your Message
          </label>
          <textarea
            id="contact-message"
            maxLength={2000}
            name="message"
            onChange={(event) => updateField("message", event.target.value)}
            placeholder="Drop Your Message..."
            ref={messageRef}
            rows={5}
            aria-invalid={Boolean(errors.message)}
            aria-describedby={errors.message ? "contact-message-error" : undefined}
            value={fields.message}
          />
          {errorMessage("message")}
        </div>

        <div className="zas-contact-terms-wrap">
          <label className="zas-contact-terms">
            <input
              checked={fields.agreedToTerms}
              name="agreedToTerms"
              onChange={(event) => updateField("agreedToTerms", event.target.checked)}
              ref={termsRef}
              type="checkbox"
              aria-invalid={Boolean(errors.agreedToTerms)}
              aria-describedby={
                errors.agreedToTerms ? "contact-agreedToTerms-error" : undefined
              }
            />
            <span>
              I&apos;ve read and agree with{" "}
              <a href={`mailto:${contactInfo.email}?subject=Terms%20and%20Conditions`}>
                terms
              </a>{" "}
              &amp;{" "}
              <a href={`mailto:${contactInfo.email}?subject=Privacy%20Policy`}>
                privacy policy
              </a>
            </span>
          </label>
          {errorMessage("agreedToTerms")}
        </div>

        <label className="zas-contact-honeypot" aria-hidden="true">
          Leave this field empty
          <input
            autoComplete="off"
            name="website"
            onChange={(event) => updateField("website", event.target.value)}
            tabIndex={-1}
            value={fields.website}
          />
        </label>

        <button className="zas-contact-submit" disabled={isSending} type="submit">
          {isSending ? "Sending..." : "Send Message"}
          {isSending ? (
            <span className="zas-contact-spinner" aria-hidden="true" />
          ) : (
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <path d="m18 2-6.2 16-2.7-6.1L3 9.2 18 2Z" />
              <path d="m9.1 11.9 4.2-4.2" />
            </svg>
          )}
        </button>

        <p
          aria-live="polite"
          className={`zas-contact-status${status ? ` is-${status.type}` : ""}`}
          role={status?.type === "error" ? "alert" : "status"}
        >
          {status?.message}
        </p>
      </form>
    </div>
  );
}
