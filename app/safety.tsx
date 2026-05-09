import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ListRow } from '@/components/list-row';
import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand } from '@/constants/theme';

export default function SafetyScreen() {
  const { t } = useTranslation();
  const [autoShare, setAutoShare] = useState(true);

  return (
    <ThemedView style={styles.container}>
      <ScreenHeader title={t('safety_screen.title')} />

      <ScrollView contentContainerStyle={styles.content}>
        <Pressable style={styles.sosCard}>
          <MaterialIcons name="emergency" size={28} color="#F4B7B7" />
          <View style={styles.sosText}>
            <ThemedText type="defaultSemiBold" style={styles.sosTitle}>
              {t('safety_screen.sos_label')}
            </ThemedText>
            <ThemedText style={styles.sosSub}>
              {t('safety_screen.sos_sub')}
            </ThemedText>
          </View>
        </Pressable>

        <ThemedText style={styles.section}>{t('safety_screen.trip_sharing')}</ThemedText>
        <View style={styles.group}>
          <View style={styles.toggleRow}>
            <View style={styles.toggleText}>
              <ThemedText>{t('safety_screen.auto_share')}</ThemedText>
              <ThemedText style={styles.toggleHint}>
                {t('safety_screen.auto_share_hint')}
              </ThemedText>
            </View>
            <Switch
              value={autoShare}
              onValueChange={setAutoShare}
              trackColor={{ false: Brand.border, true: Brand.gold }}
              thumbColor={Brand.beige}
            />
          </View>
        </View>

        <ThemedText style={styles.section}>{t('safety_screen.trusted_contacts')}</ThemedText>
        <View style={styles.group}>
          <ListRow icon="person-add-alt" label={t('safety_screen.add_contact')} />
        </View>

        <ThemedText style={styles.section}>{t('safety_screen.other')}</ThemedText>
        <View style={styles.group}>
          <ListRow icon="local-police" label={t('safety_screen.police')} hint="100" />
          <ListRow icon="medical-services" label={t('safety_screen.women_helpline')} hint="1091" />
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
    gap: 6,
  },
  sosCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: Brand.radius,
    backgroundColor: '#3A0E12',
    borderWidth: 1,
    borderColor: '#B33A3A',
  },
  sosText: {
    flex: 1,
  },
  sosTitle: {
    color: '#F4B7B7',
    fontSize: 18,
  },
  sosSub: {
    fontSize: 12,
    color: Brand.beigeMuted,
    marginTop: 2,
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
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 12,
  },
  toggleText: {
    flex: 1,
  },
  toggleHint: {
    fontSize: 12,
    color: Brand.beigeMuted,
    marginTop: 2,
  },
});
