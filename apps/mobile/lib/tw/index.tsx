import {
  useCssElement,
  useNativeVariable as useFunctionalVariable,
} from "react-native-css";
import { Link as RouterLink, LinkProps } from "expo-router";
import Animated from "react-native-reanimated";
import React, { forwardRef } from "react";
import {
  View as RNView,
  Text as RNText,
  Pressable as RNPressable,
  ScrollView as RNScrollView,
  TextInput as RNTextInput,
  FlatList as RNFlatList,
  KeyboardAvoidingView as RNKeyboardAvoidingView,
  Modal as RNModal,
  ActivityIndicator as RNActivityIndicator,
  StyleSheet,
  ViewProps as RNViewProps,
  TextProps as RNTextProps,
  PressableProps as RNPressableProps,
  ScrollViewProps as RNScrollViewProps,
  TextInputProps as RNTextInputProps,
  FlatListProps,
  KeyboardAvoidingViewProps as RNKeyboardAvoidingViewProps,
  ModalProps as RNModalProps,
  ActivityIndicatorProps as RNActivityIndicatorProps,
} from "react-native";

// ════════════════════════════════════════════════════════════════════════════
// CSS Variable Hook
// ════════════════════════════════════════════════════════════════════════════

export const useCSSVariable =
  process.env.EXPO_OS !== "web"
    ? useFunctionalVariable
    : (variable: string) => `var(${variable})`;

function renderCssElement(
  component: React.ElementType,
  props: object,
  options: Record<string, string>
) {
  return useCssElement(component as never, props as never, options as never) as React.ReactElement;
}

// ════════════════════════════════════════════════════════════════════════════
// Base Components with CSS Support
// ════════════════════════════════════════════════════════════════════════════

// View
export type ViewProps = RNViewProps & { className?: string };

export const View = (props: ViewProps) => {
  return renderCssElement(RNView, props, { className: "style" });
};
View.displayName = "CSS(View)";

// Text
export type TextProps = RNTextProps & { className?: string };

export const Text = (props: TextProps) => {
  return renderCssElement(RNText, props, { className: "style" });
};
Text.displayName = "CSS(Text)";

// Pressable
export type PressableProps = RNPressableProps & { className?: string };

export const Pressable = forwardRef<
  React.ElementRef<typeof RNPressable>,
  PressableProps
>((props, ref) => {
  const nextProps = {
    ...props,
    ref,
    accessibilityRole:
      props.accessibilityRole ?? (typeof props.onPress === "function" ? "button" : undefined),
  };

  return renderCssElement(RNPressable, nextProps, { className: "style" });
});
Pressable.displayName = "CSS(Pressable)";

// ScrollView
export type ScrollViewProps = RNScrollViewProps & {
  className?: string;
  contentContainerClassName?: string;
};

export const ScrollView = forwardRef<
  React.ElementRef<typeof RNScrollView>,
  ScrollViewProps
>((props, ref) => {
  return renderCssElement(RNScrollView, { ...props, ref }, {
    className: "style",
    contentContainerClassName: "contentContainerStyle",
  });
});
ScrollView.displayName = "CSS(ScrollView)";

// TextInput
export type TextInputProps = RNTextInputProps & { className?: string };

export const TextInput = forwardRef<
  React.ElementRef<typeof RNTextInput>,
  TextInputProps
>((props, ref) => {
  return renderCssElement(RNTextInput, { ...props, ref }, { className: "style" });
});
TextInput.displayName = "CSS(TextInput)";

// KeyboardAvoidingView
export type KeyboardAvoidingViewProps = RNKeyboardAvoidingViewProps & {
  className?: string;
};

export const KeyboardAvoidingView = (props: KeyboardAvoidingViewProps) => {
  return renderCssElement(RNKeyboardAvoidingView, props, { className: "style" });
};
KeyboardAvoidingView.displayName = "CSS(KeyboardAvoidingView)";

// Modal
export type ModalProps = RNModalProps & { className?: string };

export const Modal = (props: ModalProps) => {
  return renderCssElement(RNModal, props, { className: "style" });
};
Modal.displayName = "CSS(Modal)";

// ActivityIndicator
export type ActivityIndicatorProps = RNActivityIndicatorProps & {
  className?: string;
};

export const ActivityIndicator = (props: ActivityIndicatorProps) => {
  return renderCssElement(RNActivityIndicator, props, { className: "style" });
};
ActivityIndicator.displayName = "CSS(ActivityIndicator)";

// ════════════════════════════════════════════════════════════════════════════
// Link Component (Expo Router)
// ════════════════════════════════════════════════════════════════════════════

type CSSLinkProps = LinkProps & { className?: string };

export const Link = (props: CSSLinkProps) => {
  return renderCssElement(RouterLink, props, { className: "style" });
};
Link.displayName = "CSS(Link)";

// ════════════════════════════════════════════════════════════════════════════
// Animated Components
// ════════════════════════════════════════════════════════════════════════════

const AnimatedView = Animated.createAnimatedComponent(RNView);
const AnimatedText = Animated.createAnimatedComponent(RNText);
const AnimatedScrollView = Animated.createAnimatedComponent(RNScrollView);
const AnimatedPressable = Animated.createAnimatedComponent(RNPressable);

export type AnimatedViewProps = React.ComponentProps<typeof AnimatedView> & {
  className?: string;
};

export type AnimatedTextProps = React.ComponentProps<typeof AnimatedText> & {
  className?: string;
};

export type AnimatedScrollViewProps = React.ComponentProps<
  typeof AnimatedScrollView
> & {
  className?: string;
  contentContainerClassName?: string;
};

export type AnimatedPressableProps = React.ComponentProps<
  typeof AnimatedPressable
> & {
  className?: string;
};

const CSSAnimatedView = (props: AnimatedViewProps) => {
  return renderCssElement(AnimatedView, props, { className: "style" });
};
CSSAnimatedView.displayName = "CSS(Animated.View)";

const CSSAnimatedText = (props: AnimatedTextProps) => {
  return renderCssElement(AnimatedText, props, { className: "style" });
};
CSSAnimatedText.displayName = "CSS(Animated.Text)";

const CSSAnimatedScrollView = (props: AnimatedScrollViewProps) => {
  return renderCssElement(AnimatedScrollView, props, {
    className: "style",
    contentContainerClassName: "contentContainerStyle",
  });
};
CSSAnimatedScrollView.displayName = "CSS(Animated.ScrollView)";

const CSSAnimatedPressable = (props: AnimatedPressableProps) => {
  return renderCssElement(AnimatedPressable, props, { className: "style" });
};
CSSAnimatedPressable.displayName = "CSS(Animated.Pressable)";

export const CSSAnimated = {
  ...Animated,
  View: CSSAnimatedView,
  Text: CSSAnimatedText,
  ScrollView: CSSAnimatedScrollView,
  Pressable: CSSAnimatedPressable,
};
