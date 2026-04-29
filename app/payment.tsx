import { ScrollView, StyleSheet, View } from 'react-native';

import { ListRow } from '@/components/list-row';
import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand } from '@/constants/theme';

export default function PaymentScreen() {
  return (
    <ThemedView style={styles.container}>
      <ScreenHeader title="Payment" />

      <ScrollView contentContainerStyle={styles.content}>
        <ThemedText style={styles.section}>Default for rides</ThemedText>
        <View style={styles.group}>
          <ListRow icon="payments" label="Cash" hint="Pay the driver directly" />
        </View>

        <ThemedText style={styles.section}>UPI</ThemedText>
        <View style={styles.group}>
          <ListRow icon="account-balance-wallet" label="Add UPI" hint="GPay, PhonePe, Paytm" />
        </View>

        <ThemedText style={styles.section}>Cards</ThemedText>
        <View style={styles.group}>
          <ListRow icon="credit-card" label="Add a card" />
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
