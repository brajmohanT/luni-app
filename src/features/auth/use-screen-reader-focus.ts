import { useCallback, useRef } from 'react';
import { AccessibilityInfo, findNodeHandle, InteractionManager, type Text } from 'react-native';
import { useFocusEffect } from 'expo-router';

export function useScreenReaderFocus(focusKey?: string) {
  const targetRef = useRef<Text>(null);

  useFocusEffect(useCallback(() => {
    let active = true;
    const task = InteractionManager.runAfterInteractions(() => {
      void AccessibilityInfo.isScreenReaderEnabled().then(enabled => {
        if (!active || !enabled || focusKey === '') return;
        const target = findNodeHandle(targetRef.current);
        if (target) AccessibilityInfo.setAccessibilityFocus(target);
      });
    });

    return () => {
      active = false;
      task.cancel();
    };
  }, [focusKey]));

  return targetRef;
}
