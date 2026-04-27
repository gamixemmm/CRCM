import styles from "./Select.module.css";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options?: { value: string; label: string }[];
  placeholder?: string;
  icon?: React.ReactNode;
  fullWidth?: boolean;
}

export default function Select({
  label,
  error,
  options,
  placeholder,
  icon,
  fullWidth = true,
  className,
  id,
  children,
  ...props
}: SelectProps) {
  const selectId = id || props.name;

  return (
    <div className={cn(styles.field, fullWidth && styles.fullWidth, className)}>
      {label && (
        <label htmlFor={selectId} className={styles.label}>
          {label}
          {props.required && <span className={styles.required}>*</span>}
        </label>
      )}
      <div className={cn(styles.selectWrap, error && styles.hasError)}>
        {icon && <span className={styles.icon}>{icon}</span>}
        <select id={selectId} className={cn(styles.select, icon && styles.hasIcon)} {...props}>
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options?.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
          {children}
        </select>
        <ChevronDown size={16} className={styles.chevron} />
      </div>
      {error && <p className={styles.error}>{error}</p>}
    </div>
  );
}
