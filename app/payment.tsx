import { ScrollView, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { ListRow } from '@/components/list-row';
import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand } from '@/constants/theme';

export default function PaymentScreen() {
  const { t } = useTranslation();
  return (
    <ThemedView style={styles.container}>
      <ScreenHeader title={t('payment_screen.title')} />

      <ScrollView contentContainerStyle={styles.content}>
        <ThemedText style={styles.section}>{t('payment_screen.default_for_rides')}</ThemedText>
        <View style={styles.group}>
          <ListRow icon="payments" label={t('payment_screen.cash')} hint={t('payment_screen.cash_hint')} />
        </View>

        <ThemedText style={styles.section}>{t('payment_screen.upi')}</ThemedText>
        <View style={styles.group}>
          <ListRow icon="account-balance-wallet" label={t('payment_screen.add_upi')} hint={t('payment_screen.upi_hint')} />
        </View>

        <ThemedText style={styles.section}>{t('payment_screen.cards')}</ThemedText>
        <View style={styles.group}>
          <ListRow icon="credit-card" label={t('payment_screen.add_card')} />
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
});
