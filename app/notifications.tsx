import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand } from '@/constants/theme';

type NoticeId = 'n1' | 'n2' | 'n3';
type Notice = {
  id: NoticeId;
  icon: React.ComponentProps<typeof MaterialIcons>['name'];
};

const notices: Notice[] = [
  { id: 'n1', icon: 'check-circle' },
  { id: 'n2', icon: 'verified-user' },
  { id: 'n3', icon: 'security' },
];

export default function NotificationsScreen() {
  const { t } = useTranslation();
  return (
    <ThemedView style={styles.container}>
      <ScreenHeader title={t('notifications_screen.title')} />

      <ScrollView contentContainerStyle={styles.content}>
        {notices.map((n) => (
          <View key={n.id} style={styles.card}>
            <MaterialIcons name={n.icon} size={22} color={Brand.gold} style={styles.icon} />
            <View style={styles.text}>
              <ThemedText type="defaultSemiBold">{t(`notifications_screen.${n.id}_title`)}</ThemedText>
              <ThemedText style={styles.body}>{t(`notifications_screen.${n.id}_body`)}</ThemedText>
              <ThemedText style={styles.when}>{t(`notifications_screen.${n.id}_when`)}</ThemedText>
            </View>
          </View>
        ))}
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
    gap: 10,
  },
  card: {
    flexDirection: 'row',
    gap: 12,
    padding: 14,
    borderRadius: Brand.radius,
    backgroundColor: Brand.burgundyLight,
    borderWidth: 1,
    borderColor: Brand.border,
  },
  icon: {
    marginTop: 2,
  },
  text: {
    flex: 1,
  },
  body: {
    fontSize: 13,
    color: Brand.beigeMuted,
    marginTop: 2,
  },
  when: {
    fontSize: 11,
    color: Brand.beigeMuted,
    marginTop: 6,
  },
});
