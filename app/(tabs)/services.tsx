import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand } from '@/constants/theme';

type Service = {
  id: 'auto' | 'bike';
  icon: React.ComponentProps<typeof MaterialIcons>['name'];
};

const services: Service[] = [
  { id: 'auto', icon: 'directions-car' },
  { id: 'bike', icon: 'two-wheeler' },
];

export default function ServicesScreen() {
  const { t } = useTranslation();
  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <ThemedText type="title" style={styles.title}>
          {t('services_screen.title')}
        </ThemedText>
        <ThemedText style={styles.subtitle}>
          {t('services_screen.subtitle')}
        </ThemedText>

        <View style={styles.grid}>
          {services.map((s) => (
            <Pressable
              key={s.id}
              style={({ pressed }) => [styles.tile, pressed && styles.tilePressed]}
              onPress={() => router.push('/destination')}
            >
              <View style={styles.iconBubble}>
                <MaterialIcons name={s.icon} size={32} color={Brand.burgundyDark} />
              </View>
              <ThemedText type="defaultSemiBold">{t(`services_screen.${s.id}`)}</ThemedText>
              <ThemedText style={styles.tileSub}>{t(`services_screen.${s.id}_sub`)}</ThemedText>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Brand.burgundy,
  },
  content: {
    padding: 20,
    paddingTop: 64,
    gap: 6,
  },
  title: {
    marginBottom: 4,
  },
  subtitle: {
    color: Brand.beigeMuted,
    marginBottom: 20,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  tile: {
    width: '47%',
    aspectRatio: 1,
    padding: 14,
    borderRadius: 12,
    backgroundColor: Brand.burgundyLight,
    borderWidth: 1,
    borderColor: Brand.border,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  tilePressed: {
    opacity: 0.85,
  },
  iconBubble: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Brand.gold,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  tileSub: {
    fontSize: 12,
    color: Brand.beigeMuted,
    textAlign: 'center',
  },
});
