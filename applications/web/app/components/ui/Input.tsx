import type { ComponentPropsWithoutRef } from "react";

type InputProps = ComponentPropsWithoutRef<"input"> & {
  error?: string;
};

export function Input({ error, className = "", ...rest }: InputProps) {
  const borderClasses = error
    ? "border-red-500 focus:ring-red-500/40"
    : "border-gray-300 focus:border-indigo-500 focus:ring-indigo-500/40 dark:border-gray-700";

  return (
    <div className="w-full">
      <input
        aria-invalid={error ? true : undefined}
        className={`w-full rounded-lg border bg-white px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition focus:outline-none focus:ring-2 dark:bg-gray-900 dark:text-gray-100 dark:placeholder-gray-500 ${borderClasses} ${className}`}
        {...rest}
      />
      {error ? (
        <p role="alert" className="mt-2 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}
    </div>
  );
}
