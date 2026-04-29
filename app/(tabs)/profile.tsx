import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';

import { ListRow } from '@/components/list-row';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand } from '@/constants/theme';

export default function ProfileScreen() {
  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <ThemedText type="title" style={styles.title}>
          Profile
        </ThemedText>

        <View style={styles.identityCard}>
          <View style={styles.avatar}>
            <MaterialIcons name="person" size={32} color={Brand.burgundyDark} />
          </View>
          <View style={styles.identityText}>
            <ThemedText type="defaultSemiBold" style={styles.identityName}>
              Aanya
            </ThemedText>
            <ThemedText style={styles.identityPhone}>+91 98765 43210</ThemedText>
          </View>
          <MaterialIcons name="chevron-right" size={22} color={Brand.beigeMuted} />
        </View>

        <View style={styles.ratingCard}>
          <MaterialIcons name="star" size={20} color={Brand.gold} />
          <ThemedText style={styles.ratingValue}>4.9</ThemedText>
          <ThemedText style={styles.ratingLabel}>My rating</ThemedText>
        </View>

        <View style={styles.group}>
          <ListRow icon="verified-user" label="Verify identity" hint="Aadhaar + selfie" onPress={() => router.push('/sign-up')} />
          <ListRow icon="history" label="My rides" onPress={() => router.push('/rides')} />
          <ListRow icon="payment" label="Payment" onPress={() => router.push('/payment')} />
          <ListRow icon="security" label="Safety" onPress={() => router.push('/safety')} />
          <ListRow icon="favorite-border" label="Saved places" onPress={() => router.push('/favorites')} />
          <ListRow icon="notifications-none" label="Notifications" onPress={() => router.push('/notifications')} />
          <ListRow icon="help-outline" label="Help" onPress={() => router.push('/help')} />
          <ListRow icon="info-outline" label="About Kyra" onPress={() => router.push('/about')} />
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
    paddingTop: 64,
    paddingHorizontal: 16,
    paddingBottom: 32,
    gap: 14,
  },
  title: {
    paddingHorizontal: 4,
  },
  identityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    backgroundColor: Brand.burgundyLight,
    borderWidth: 1,
    borderColor: Brand.border,
    borderRadius: Brand.radius,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Brand.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  identityText: {
    flex: 1,
  },
  identityName: {
    fontSize: 16,
  },
  identityPhone: {
    fontSize: 13,
    color: Brand.beigeMuted,
    marginTop: 2,
  },
  ratingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 14,
    backgroundColor: Brand.burgundyLight,
    borderWidth: 1,
    borderColor: Brand.border,
    borderRadius: Brand.radius,
  },
  ratingValue: {
    fontWeight: '600',
    color: Brand.gold,
  },
  ratingLabel: {
    color: Brand.beigeMuted,
  },
  group: {
    marginTop: 6,
    backgroundColor: Brand.burgundyLight,
    borderWidth: 1,
    borderColor: Brand.border,
    borderRadius: Brand.radius,
    overflow: 'hidden',
  },
});
