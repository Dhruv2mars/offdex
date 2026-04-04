import { forwardRef, useState } from "react";
import { TextInput as RNTextInput } from "react-native";
import { TextInput, View, type TextInputProps } from "../../lib/tw";
import { cn } from "../../lib/utils";

// ════════════════════════════════════════════════════════════════════════════
// Input Component
// ════════════════════════════════════════════════════════════════════════════

export interface InputProps extends TextInputProps {
  error?: boolean;
}

export const Input = forwardRef<RNTextInput, InputProps>(
  ({ className, error, onFocus, onBlur, ...props }, ref) => {
    const [isFocused, setIsFocused] = useState(false);

    return (
      <TextInput
        ref={ref}
        className={cn(
          "h-11 rounded-xl bg-input px-4",
          "text-sm text-foreground",
          "border",
          isFocused ? "border-ring" : "border-border",
          error && "border-destructive",
          className
        )}
        placeholderTextColor="#71717a"
        onFocus={(e) => {
          setIsFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setIsFocused(false);
          onBlur?.(e);
        }}
        {...props}
      />
    );
  }
);

Input.displayName = "Input";

// ════════════════════════════════════════════════════════════════════════════
// Textarea Component
// ════════════════════════════════════════════════════════════════════════════

export interface TextareaProps extends TextInputProps {
  error?: boolean;
}

export const Textarea = forwardRef<RNTextInput, TextareaProps>(
  ({ className, error, onFocus, onBlur, ...props }, ref) => {
    const [isFocused, setIsFocused] = useState(false);

    return (
      <TextInput
        ref={ref}
        multiline
        textAlignVertical="top"
        className={cn(
          "min-h-[100px] rounded-xl bg-input px-4 py-3",
          "text-sm text-foreground leading-relaxed",
          "border",
          isFocused ? "border-ring" : "border-border",
          error && "border-destructive",
          className
        )}
        placeholderTextColor="#71717a"
        onFocus={(e) => {
          setIsFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setIsFocused(false);
          onBlur?.(e);
        }}
        {...props}
      />
    );
  }
);

Textarea.displayName = "Textarea";
