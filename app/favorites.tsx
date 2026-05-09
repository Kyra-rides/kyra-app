import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, Layout } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation();
  const saved = useSaved();

  useEffect(() => {
    void hydratePlaces();
  }, []);

  const home = saved.find((s) => s.id === HOME_SLOT);
  const work = saved.find((s) => s.id === WORK_SLOT);
  const custom = saved.filter((s) => s.id !== HOME_SLOT && s.id !== WORK_SLOT);

  const homeLabel = t('favorites.label_home');
  const workLabel = t('favorites.label_work');

  const editSlot = (slotId: string, label: string) => {
    router.push({ pathname: '/destination', params: { saveTo: slotId, saveLabel: label } });
  };

  const addCustom = () => {
    Alert.prompt(
      t('favorites.save_a_place_title'),
      t('favorites.save_a_place_body'),
      [
        { text: t('favorites.cancel'), style: 'cancel' },
        {
          text: t('favorites.next'),
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
      t('favorites.remove_q', { label: slot.label }),
      t('favorites.remove_body', { name: slot.place.name }),
      [
        { text: t('favorites.cancel'), style: 'cancel' },
        { text: t('favorites.remove'), style: 'destructive', onPress: () => removeSaved(slot.id) },
      ],
    );
  };

  return (
    <ThemedView style={styles.container}>
      <ScreenHeader title={t('favorites.title')} />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.group}>
          <SavedRow
            icon="home"
            label={homeLabel}
            slot={home}
            onPress={() => editSlot(HOME_SLOT, homeLabel)}
            onRemove={home ? () => confirmRemove(home) : undefined}
          />
          <SavedRow
            icon="work-outline"
            label={workLabel}
            slot={work}
            onPress={() => editSlot(WORK_SLOT, workLabel)}
            onRemove={work ? () => confirmRemove(work) : undefined}
            isLast
          />
        </View>

        <ThemedText style={styles.section}>{t('favorites.section_custom')}</ThemedText>
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
              {t('favorites.add_saved')}
            </ThemedText>
          </Pressable>
        </View>

        {saved.length === 0 ? (
          <Animated.View entering={FadeIn.duration(200)} style={styles.hint}>
            <ThemedText style={styles.hintText}>
              {t('favorites.empty_hint')}
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
  const { t } = useTranslation();
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
          {slot ? slot.place.name : t('favorites.add_address_hint', { label: label.toLowerCase() })}
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
