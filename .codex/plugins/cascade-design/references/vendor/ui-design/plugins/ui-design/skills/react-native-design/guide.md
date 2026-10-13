> Local governing process: [Design index](../../../../../../README.md), [one brief](../../../../../../process/intake.md) and [evidence/authority](../../../../../../process/review-and-evidence.md). Full [license](../../../../../../licenses/ui-design/LICENSE) retained. This is adapted reference knowledge under the current accepted target/task and host permissions; it is not a new skill, agent or external runtime.

> Local adaptation - Cascade Codex, 2026-10-07. Original: wshobson/agents@46891e7e60da0e52baf1050b7b6391b64e84c6d9, plugins/ui-design/skills/react-native-design/SKILL.md; SHA256 71eacfb8d4a62142e135e8b1934ffb540b0d2703d6b6b273d4c0f255bb1aa68d. License: [retained MIT notice](../../../../../../licenses/ui-design/LICENSE). This file is modified: foreign discovery/controller/artifact/tool/effect assumptions and the recorded incompatibilities are replaced below. Complete compatible topic text/examples are retained; excluded sections remain in immutable source audit evidence.
>
> Parent authority: Create Design owns intake, inquiry/direction/decision and prototype; Product owns truth/behavior, design-system owns reusable rules, accessibility/visual owners review evidence, and Frontend/host owns production, persistence, permissions and execution. Consult [the local governing phase](../../../../../../process/prototype-and-build.md); this reference is progressively loaded for the actual task/platform, not another trigger or installation. Examples/dates/counts/styles are illustrative unless bound to actual evidence. External URLs are provenance/reference identities; operative steps are local, and no fetch, outreach, install, listener, publish or API call is implied.

# React Native Design

Master React Native styling patterns, React Navigation, and Reanimated 3 to build performant, cross-platform mobile applications with native-quality user experiences.

## When to Use This Skill

- Building cross-platform mobile apps with React Native
- Implementing navigation with React Navigation 6+
- Creating performant animations with Reanimated 3
- Styling components with StyleSheet and styled-components
- Building responsive layouts for different screen sizes
- Implementing platform-specific designs (iOS/Android)
- Creating gesture-driven interactions with Gesture Handler
- Optimizing React Native performance

## Detailed section: Core Concepts

Originally a 6471-byte section in this SKILL.md. Moved to [local reference](references/details.md) to fit Codex's 8 KB skill body cap.

## Quick Start Component

```typescript
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';

interface ItemCardProps {
  title: string;
  subtitle: string;
  imageUrl: string;
  onPress: () => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function ItemCard({ title, subtitle, imageUrl, onPress }: ItemCardProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      style={[styles.card, animatedStyle]}
      onPress={onPress}
      onPressIn={() => { scale.value = withSpring(0.97); }}
      onPressOut={() => { scale.value = withSpring(1); }}
    >
      <Image source={{ uri: imageUrl }} style={styles.image} />
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.subtitle} numberOfLines={2}>
          {subtitle}
        </Text>
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  image: {
    width: '100%',
    height: 160,
    backgroundColor: '#f3f4f6',
  },
  content: {
    padding: 16,
    gap: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
});
```

## Best Practices

1. **Use TypeScript**: Define navigation and prop types for type safety
2. **Memoize Components**: Use `React.memo` and `useCallback` to prevent unnecessary rerenders
3. **Run Animations on UI Thread**: Use Reanimated worklets for 60fps animations
4. **Avoid Inline Styles**: Use StyleSheet.create for performance
5. **Handle Safe Areas**: Use `SafeAreaView` or `useSafeAreaInsets`
6. **Test on Real Devices**: Simulator/emulator performance differs from real devices
7. **Use FlatList for Lists**: Never use ScrollView with map for long lists
8. **Platform-Specific Code**: Use Platform.select for iOS/Android differences

## Common Issues

- **Gesture Conflicts**: Wrap gestures with `GestureDetector` and use `simultaneousHandlers`
- **Navigation Type Errors**: Define `ParamList` types for all navigators
- **Animation Jank**: Move animations to UI thread with `runOnUI` worklets
- **Memory Leaks**: Cancel animations and cleanup in useEffect
- **Font Loading**: Use `expo-font` or `react-native-asset` for custom fonts
- **Safe Area Issues**: Test on notched devices (iPhone, Android with cutouts)
