import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, Layout } from 'react-native-reanimated';

import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand } from '@/constants/theme';
import {
  HOME_SLOT,
  WORK_SLOT,
  hydratePlaces,
  newCustomSlotId,
  removeSaved,
  useSaved,
  type SavedSlot,
} from '@/services/places';

export default function FavoritesScreen() {
  const saved = useSaved();

  useEffect(() => {
    void hydratePlaces();
  }, []);

  const home = saved.find((s) => s.id === HOME_SLOT);
  const work = saved.find((s) => s.id === WORK_SLOT);
  const custom = saved.filter((s) => s.id !== HOME_SLOT && s.id !== WORK_SLOT);

  const editSlot = (slotId: string, label: string) => {
    router.push({ pathname: '/destination', params: { saveTo: slotId, saveLabel: label } });
  };

  const addCustom = () => {
    Alert.prompt(
      'Save a place',
      'What do you want to call it? (e.g. Mum’s, Gym)',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Next',
          onPress: (text?: string) => {
            const trimmed = (text ?? '').trim();
            if (!trimmed) return;
            router.push({
              pathname: '/destination',
              params: { saveTo: newCustomSlotId(), saveLabel: trimmed },
            });
          },
        },
      ],
      'plain-text',
    );
  };

  const confirmRemove = (slot: SavedSlot) => {
    Alert.alert(
      `Remove ${slot.label}?`,
      `“${slot.place.name}” will no longer be a quick shortcut.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => removeSaved(slot.id) },
      ],
    );
  };

  return (
    <ThemedView style={styles.container}>
      <ScreenHeader title="Saved places" />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.group}>
          <SavedRow
            icon="home"
            label="Home"
            slot={home}
            onPress={() => editSlot(HOME_SLOT, 'Home')}
            onRemove={home ? () => confirmRemove(home) : undefined}
          />
          <SavedRow
            icon="work-outline"
            label="Work"
            slot={work}
            onPress={() => editSlot(WORK_SLOT, 'Work')}
            onRemove={work ? () => confirmRemove(work) : undefined}
            isLast
          />
        </View>

        <ThemedText style={styles.section}>Custom</ThemedText>
        <View style={styles.group}>
          {custom.map((s, i) => (
            <Animated.View
              key={s.id}
              entering={FadeInDown.duration(220).delay(i * 30)}
              layout={Layout.duration(180)}
            >
              <SavedRow
                icon="star"
                label={s.label}
                slot={s}
                onPress={() => editSlot(s.id, s.label)}
                onRemove={() => confirmRemove(s)}
                isLast={i === custom.length - 1}
              />
            </Animated.View>
          ))}
          <Pressable
            style={({ pressed }) => [styles.row, pressed && styles.pressed]}
            onPress={addCustom}
            android_ripple={{ color: Brand.burgundyDark, borderless: false }}
          >
            <MaterialIcons name="add" size={22} color={Brand.gold} style={styles.rowIcon} />
            <ThemedText style={[styles.rowLabel, { color: Brand.gold }]}>
              Add a saved place
            </ThemedText>
          </Pressable>
        </View>

        {saved.length === 0 ? (
          <Animated.View entering={FadeIn.duration(200)} style={styles.hint}>
            <ThemedText style={styles.hintText}>
              Save Home, Work or any place you visit often — Kyra will offer it as a shortcut.
            </ThemedText>
          </Animated.View>
        ) : null}
      </ScrollView>
    </ThemedView>
  );
}

type SavedRowProps = {
  icon: React.ComponentProps<typeof MaterialIcons>['name'];
  label: string;
  slot?: SavedSlot;
  onPress: () => void;
  onRemove?: () => void;
  isLast?: boolean;
};

function SavedRow({ icon, label, slot, onPress, onRemove, isLast }: SavedRowProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.row, !isLast && styles.rowDivider, pressed && styles.pressed]}
      android_ripple={{ color: Brand.burgundyDark, borderless: false }}
    >
      <MaterialIcons name={icon} size={22} color={Brand.beigeMuted} style={styles.rowIcon} />
      <View style={styles.rowText}>
        <ThemedText style={styles.rowLabel}>{label}</ThemedText>
        <ThemedText style={styles.rowHint} numberOfLines={1}>
          {slot ? slot.place.name : `Add your ${label.toLowerCase()} address`}
        </ThemedText>
      </View>
      {slot && onRemove ? (
        <Pressable hitSlop={8} onPress={onRemove} style={styles.remove}>
          <MaterialIcons name="close" size={18} color={Brand.beigeMuted} />
        </Pressable>
      ) : (
        <MaterialIcons name="chevron-right" size={22} color={Brand.beigeMuted} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Brand.burgundy,
  },
  content: {
    padding: 16,
    gap: 6,
  },
  section: {
    color: Brand.beigeMuted,
    fontSize: 12,
    marginTop: 12,
    paddingHorizontal: 4,
  },
  group: {
    backgroundColor: Brand.burgundyLight,
    borderWidth: 1,
    borderColor: Brand.border,
    borderRadius: Brand.radius,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  rowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Brand.burgundyLight,
  },
  pressed: {
    opacity: 0.75,
  },
  rowIcon: {
    marginRight: 12,
    width: 24,
    textAlign: 'center',
  },
  rowText: {
    flex: 1,
  },
  rowLabel: {
    fontSize: 16,
  },
  rowHint: {
    fontSize: 12,
    color: Brand.beigeMuted,
    marginTop: 2,
  },
  remove: {
    padding: 6,
  },
  hint: {
    paddingHorizontal: 4,
    paddingTop: 12,
  },
  hintText: {
    fontSize: 12,
    color: Brand.beigeMuted,
  },
});
