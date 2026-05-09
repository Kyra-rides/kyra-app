import { Image, ScrollView, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { ListRow } from '@/components/list-row';
import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand } from '@/constants/theme';

export default function AboutScreen() {
  const { t } = useTranslation();
  return (
    <ThemedView style={styles.container}>
      <ScreenHeader title={t('about.title')} />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.brandCard}>
          <Image
            source={require('@/assets/images/kyra-logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <ThemedText style={styles.tagline}>
            {t('about.tagline')}
          </ThemedText>
          <ThemedText style={styles.version}>{t('about.version')}</ThemedText>
        </View>

        <View style={styles.group}>
          <ListRow icon="description" label={t('about.terms')} />
          <ListRow icon="lock-outline" label={t('about.privacy')} />
          <ListRow icon="gavel" label={t('about.licenses')} />
          <ListRow icon="public" label={t('about.website')} />
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
    padding: 16,
    gap: 14,
  },
  brandCard: {
    alignItems: 'center',
    gap: 8,
    padding: 20,
    borderRadius: Brand.radius,
    backgroundColor: Brand.burgundyLight,
    borderWidth: 1,
    borderColor: Brand.border,
  },
  logo: {
    width: 160,
    height: 80,
  },
  tagline: {
    color: Brand.beigeMuted,
    textAlign: 'center',
  },
  version: {
    fontSize: 12,
    color: Brand.beigeMuted,
    marginTop: 8,
  },
  group: {
    backgroundColor: Brand.burgundyLight,
    borderWidth: 1,
    borderColor: Brand.border,
    borderRadius: Brand.radius,
    overflow: 'hidden',
  },
});
